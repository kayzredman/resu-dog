// The results view shared by the Optimize and Build CV flows (see DESIGN-SPEC.md → Results).

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { InfoSheet, NativeButton, NativeIcon, Segmented } from '@/components/native';
import { Bullets, Card, Notice, Pill, T, TextAction } from '@/components/ui';
import { BodySize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shareAsPdf } from '@/lib/pdf';
import { countPlaceholders, PLACEHOLDER_PATTERN, splitPlaceholders } from '@/lib/placeholders';
import type { AssessmentData, Mode, ScoreData, Verdict } from '@/lib/types';

type Segment = 'overview' | 'resume' | 'letter';

export interface ResultsViewProps {
  mode: Mode;
  scoreBefore?: ScoreData;
  scoreAfter: ScoreData;
  assessment?: AssessmentData;
  resume: string;
  coverLetter?: string;
  changes: string[];
  /** Called when the visible section changes, so the screen can scroll back to the top. */
  onSectionChange?: () => void;
}

// Honest, outcome-free wording: this is a read of the paper, not a hiring prediction
// With no job (Just polish) the verdict is about readiness, not fit to a role
const FIT: Record<Mode, Record<Verdict, { label: string; tone: 'primary' | 'placeholder' | 'neutral' }>> = {
  targeted: {
    Strong: { label: 'Strong fit on paper', tone: 'primary' },
    Good: { label: 'Good fit on paper', tone: 'primary' },
    Fair: { label: 'Partial fit on paper', tone: 'placeholder' },
    Low: { label: 'Weak fit on paper', tone: 'neutral' },
  },
  general: {
    Strong: { label: 'Ready to send', tone: 'primary' },
    Good: { label: 'Nearly ready', tone: 'primary' },
    Fair: { label: 'Needs some work', tone: 'placeholder' },
    Low: { label: 'Needs a lot of work', tone: 'neutral' },
  },
};

const PLACEHOLDER_SCORING = { heading: 'Your [brackets]', body: 'Scores are worked out on the resume as it is now, before you fill in your real numbers. We don’t count the brackets against you.' };

const SCORING_SECTIONS_JOB = [
  { heading: 'Keyword coverage — counted', body: 'We list the key skills in the job description, then count how many your resume actually contains. The same list is used before and after, so the two are comparable.' },
  { heading: 'Skills alignment — AI estimate', body: 'How closely your experience matches what the role asks for, judged in a recruiter style. Treat it as a guide.' },
  { heading: 'Easy for hiring software to read — AI estimate', body: 'Applicant tracking systems (ATS) read plain, single-column resumes most reliably. This checks your layout and section headings.' },
  { heading: 'What it can’t tell you', body: 'No tool can say how a particular employer’s system or recruiter will rank you. The score is our estimate.' },
];

const SCORING_SECTIONS_POLISH = [
  { heading: 'No job, no keyword matching', body: 'Without a job description we don’t match keywords. We score how strong the resume is on its own.' },
  { heading: 'Clarity, action language, structure, completeness — AI estimates', body: 'Is it easy to read? Do bullets lead with strong verbs and real results? Are sections in a sensible order? Is anything essential missing (contact, experience, education, skills)?' },
  { heading: 'The overall score', body: 'The plain average of those four, worked out by us, not guessed.' },
  { heading: 'Want a match score?', body: 'Switch to “For a job” and paste a job description to see how well you fit a specific role.' },
];

export function ResultsView({ mode, scoreBefore, scoreAfter, assessment, resume: initialResume, coverLetter, changes, onSectionChange }: ResultsViewProps) {
  const c = useTheme();
  const [segment, setSegment] = useState<Segment>('overview');

  // Scroll back to the top once the new section has rendered (not on first mount)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = requestAnimationFrame(() => onSectionChange?.());
    return () => cancelAnimationFrame(id);
  }, [segment]); // eslint-disable-line react-hooks/exhaustive-deps
  const [resume, setResume] = useState(initialResume);
  const [editing, setEditing] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hasLetter = mode === 'targeted' && !!coverLetter;
  const resumePlaceholders = countPlaceholders(resume);
  const letterPlaceholders = coverLetter ? countPlaceholders(coverLetter) : 0;

  const segments: { value: Segment; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'resume', label: resumePlaceholders ? `Resume (${resumePlaceholders})` : 'Resume' },
    ...(hasLetter ? [{ value: 'letter' as const, label: 'Letter' }] : []),
  ];

  const activeText = segment === 'letter' && coverLetter ? coverLetter : resume;
  const activeKind = segment === 'letter' ? 'letter' : 'resume';
  const activePlaceholders = segment === 'letter' ? letterPlaceholders : resumePlaceholders;

  /** Every way out (PDF, copy) checks for unfilled placeholders first. */
  const guardPlaceholders = (action: () => void) => {
    if (activePlaceholders === 0) return action();
    Alert.alert(
      `${activePlaceholders} detail${activePlaceholders === 1 ? '' : 's'} still to fill in`,
      'Some lines still have [brackets] where your real number belongs. Fill them in or delete them before you send this.',
      [
        {
          text: 'Fill them in',
          style: 'cancel',
          onPress: () => {
            if (activeKind === 'resume') {
              setSegment('resume');
              setEditing(true);
            }
          },
        },
        { text: 'Continue anyway', onPress: action },
      ]
    );
  };

  const savePdf = () =>
    guardPlaceholders(async () => {
      setExporting(true);
      try {
        await shareAsPdf(activeText, activeKind, activeKind === 'resume' ? 'Save your resume' : 'Save your cover letter');
      } catch (err) {
        Alert.alert('Couldn’t create the PDF', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setExporting(false);
      }
    });

  const copyText = () =>
    guardPlaceholders(async () => {
      await Clipboard.setStringAsync(activeText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Copied', activeKind === 'resume' ? 'Your resume text is on the clipboard.' : 'Your cover letter is on the clipboard.');
    });

  return (
    <View style={{ gap: Spacing.lg }}>
      <Segmented options={segments} value={segment} onChange={setSegment} accessibilityLabel="Result sections" />

      {segment === 'overview' && (
        <>
          <ScoreCard mode={mode} before={scoreBefore} after={scoreAfter} assessment={assessment} onExplain={() => setScoringOpen(true)} />
          <NextMoves
            mode={mode}
            placeholders={resumePlaceholders}
            assessment={assessment}
            hasLetter={hasLetter}
            onFill={() => {
              setSegment('resume');
              setEditing(true);
            }}
            onLetter={() => setSegment('letter')}
          />
          {mode === 'targeted' && assessment?.skills_heatmap?.length ? <SkillsCard assessment={assessment} /> : null}
          <BreakdownCard mode={mode} score={scoreAfter} onExplain={() => setScoringOpen(true)} />
          {assessment ? <ReviewCard mode={mode} assessment={assessment} /> : null}
        </>
      )}

      {segment === 'resume' && (
        <>
          {resumePlaceholders > 0 && (
            <Notice tone="placeholder">
              <T tone="placeholder">
                <Text style={{ fontWeight: '700' }}>{resumePlaceholders} detail{resumePlaceholders === 1 ? '' : 's'} to fill in. </Text>
                We never invent numbers. Replace each [bracket] with your real figure, or delete it.
              </T>
            </Notice>
          )}
          <Card>
            <View style={styles.cardHeader}>
              <T variant="title">Your resume</T>
              <TextAction
                title={editing ? 'Done' : 'Edit'}
                accessibilityLabel={editing ? 'Done editing resume' : 'Edit resume'}
                onPress={() => setEditing((v) => !v)}
              />
            </View>
            {editing ? (
              <TextInput
                value={resume}
                onChangeText={setResume}
                multiline
                scrollEnabled={false}
                autoCorrect={false}
                textAlignVertical="top"
                accessibilityLabel="Edit resume text"
                style={[styles.editor, { color: c.text, borderColor: c.primaryInk, backgroundColor: c.background }]}
              />
            ) : (
              <HighlightedText text={resume} />
            )}
          </Card>
          {changes.length > 0 && (
            <Card>
              <T variant="title">What we changed</T>
              <Bullets items={changes} />
            </Card>
          )}
        </>
      )}

      {segment === 'letter' && coverLetter && (
        <>
          {letterPlaceholders > 0 && (
            <Notice tone="placeholder">{`${letterPlaceholders} detail${letterPlaceholders === 1 ? '' : 's'} to fill in before you send this letter.`}</Notice>
          )}
          <Card>
            <T variant="title">Cover letter</T>
            <T variant="footnote" tone="muted">Written from your final resume.</T>
            <HighlightedText text={coverLetter} />
          </Card>
        </>
      )}

      <View style={{ gap: Spacing.sm }}>
        <NativeButton
          label={activeKind === 'resume' ? 'Save or share resume PDF' : 'Save or share letter PDF'}
          onPress={savePdf}
          loading={exporting}
        />
        <NativeButton label="Copy text" variant="outlined" onPress={copyText} />
        <T variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: Spacing.xs }}>
          Results clear when you close the app — save your PDF.
        </T>
      </View>

      <InfoSheet title="How is this scored?" sections={[...(mode === 'general' ? SCORING_SECTIONS_POLISH : SCORING_SECTIONS_JOB), ...(resumePlaceholders > 0 ? [PLACEHOLDER_SCORING] : [])]} isPresented={scoringOpen} onDismiss={() => setScoringOpen(false)} />
    </View>
  );
}

// ─── Text with highlighted [placeholders] ────────────────────────────────────

function HighlightedText({ text }: { text: string }) {
  const c = useTheme();
  // Screen readers hear "fill in X%" instead of reading brackets
  const spoken = text.replace(PLACEHOLDER_PATTERN, (m) => ` fill in: ${m.slice(1, -1)} `);
  return (
    <Text selectable accessibilityLabel={spoken} style={[styles.docText, { color: c.textSoft }]}>
      {splitPlaceholders(text).map((part, i) =>
        i % 2 === 1 ? (
          <Text
            key={i}
            style={{
              backgroundColor: c.placeholderBg,
              color: c.placeholderText,
              fontWeight: '700',
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: c.placeholderLine,
            }}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

// ─── Overview cards ──────────────────────────────────────────────────────────

function ScoreCard({
  mode,
  before,
  after,
  assessment,
  onExplain,
}: {
  mode: Mode;
  before?: ScoreData;
  after: ScoreData;
  assessment?: AssessmentData;
  onExplain: () => void;
}) {
  const c = useTheme();
  const fit = assessment ? FIT[mode][assessment.shortlist_probability] ?? FIT[mode].Fair : null;
  const delta = before ? after.overall_score - before.overall_score : null;
  const what = mode === 'general' ? 'estimated quality' : 'estimated match';
  const spoken = `${what}: ${after.overall_score} out of 100${delta ? `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} from your original` : ''}`;

  return (
    <Card>
      {fit ? <View style={styles.row}><Pill label={fit.label} tone={fit.tone} /></View> : null}
      <View accessible accessibilityLabel={spoken} style={styles.scoreRow}>
        <Text style={[styles.bigScore, { color: c.primaryInk }]}>{after.overall_score}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="subhead" tone="muted">{what}, out of 100</T>
          {delta ? (
            <T variant="subhead" tone="primary" style={{ fontWeight: '700' }}>
              {delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`} from your original
            </T>
          ) : null}
        </View>
      </View>

      {before ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ gap: 6 }}>
          <View style={[styles.track, { backgroundColor: c.surfaceMuted }]}>
            <View style={[styles.fill, { width: `${clamp(after.overall_score)}%`, backgroundColor: c.primary }]} />
            <View style={[styles.marker, { left: `${clamp(before.overall_score)}%`, backgroundColor: c.text }]} />
          </View>
          <View style={styles.spread}>
            <T variant="footnote" tone="muted">before {before.overall_score}</T>
            <T variant="footnote" tone="muted">after {after.overall_score}</T>
          </View>
        </View>
      ) : null}

      {assessment?.probability_rationale || after.summary ? (
        <T tone="soft">{assessment?.probability_rationale || after.summary}</T>
      ) : null}
      <TextAction title="How is this scored?" onPress={onExplain} />
    </Card>
  );
}

function NextMoves({
  mode,
  placeholders,
  assessment,
  hasLetter,
  onFill,
  onLetter,
}: {
  mode: Mode;
  placeholders: number;
  assessment?: AssessmentData;
  hasLetter: boolean;
  onFill: () => void;
  onLetter: () => void;
}) {
  const gap = assessment?.critical_gaps?.[0];
  const quickWin = assessment?.quick_wins?.[0];

  // Only talk about [brackets] when there are some to fill in
  const moves: { done: boolean; title: string; detail: string; action?: { label: string; onPress: () => void } }[] =
    placeholders > 0
      ? [
          {
            done: false,
            title: `Add ${placeholders} real number${placeholders === 1 ? '' : 's'}`,
            detail: 'We left [brackets] where a figure would make a line stronger. Only you know them.',
            action: { label: 'Fill them in', onPress: onFill },
          },
        ]
      : [];
  const hasPlans = !!assessment?.gap_roadmap?.length;
  if (gap && mode === 'general') {
    moves.push({
      done: false,
      title: 'Fix the main weak spot',
      detail: `${gap.trim().replace(/[.!]*$/, '.')} Edit your resume to address it with your own details.`,
    });
  } else if (gap) {
    moves.push({
      done: false,
      title: 'Address a likely gap',
      detail: `${gap.trim().replace(/[.!]*$/, '.')} If you have related experience, add it${hasPlans ? '; if not, see the suggested plan below' : ''}.`,
    });
  } else if (quickWin) {
    moves.push({ done: false, title: 'One quick improvement', detail: quickWin });
  }
  if (hasLetter) {
    moves.push({
      done: false,
      title: 'Read your cover letter',
      detail: 'Written from your final resume. About two minutes.',
      action: { label: 'Open the letter', onPress: onLetter },
    });
  }
  if (!moves.length) {
    moves.push({ done: true, title: 'Read it through, then send it', detail: 'Check every line is true and sounds like you.' });
  }

  return (
    <Card>
      <T variant="title">Your next moves</T>
      {moves.map((m, i) => (
        <View key={i} style={styles.move}>
          <NativeIcon name={m.done ? 'check' : 'todo'} size={22} />
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="heading">{m.title}</T>
            <T variant="subhead" tone="muted">{m.detail}</T>
            {m.action ? (
              <View style={{ alignSelf: 'flex-start', marginTop: Spacing.xs }}>
                <NativeButton label={m.action.label} variant="outlined" fullWidth={false} onPress={m.action.onPress} />
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

function SkillsCard({ assessment }: { assessment: AssessmentData }) {
  const heatmap = assessment.skills_heatmap ?? [];
  return (
    <Card>
      <T variant="title">Skills the job asks for</T>
      <T variant="footnote" tone="muted">
        {heatmap.filter((s) => s.status === 'matched').length} matched · {heatmap.filter((s) => s.status === 'transferable').length} close · {heatmap.filter((s) => s.status === 'gap').length} to learn
      </T>
      <View style={styles.wrap}>
        {heatmap.map((s) =>
          s.status === 'matched' ? (
            <Pill key={s.skill} label={`${s.skill} · matched`} tone="primary" icon="check" />
          ) : s.status === 'transferable' ? (
            <Pill key={s.skill} label={`${s.skill} · close`} tone="placeholder" />
          ) : (
            <Pill key={s.skill} label={`${s.skill} · to learn`} tone="neutral" icon="todo" />
          )
        )}
      </View>
      {assessment.transferable_bridges?.length ? (
        <View style={{ gap: Spacing.sm }}>
          <T variant="heading">How your experience transfers</T>
          {assessment.transferable_bridges.map((b) => (
            <T key={b.skill} tone="soft"><Text style={{ fontWeight: '700' }}>{b.skill}: </Text>{b.bridge}</T>
          ))}
        </View>
      ) : null}
      {assessment.gap_roadmap?.length ? (
        <View style={{ gap: Spacing.sm }}>
          <T variant="heading">Suggested plans</T>
          {assessment.gap_roadmap.map((g) => (
            <T key={g.skill} tone="soft"><Text style={{ fontWeight: '700' }}>{g.skill}: </Text>{g.action}</T>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function BreakdownCard({ mode, score, onExplain }: { mode: Mode; score: ScoreData; onExplain: () => void }) {
  const rows: [string, number | undefined, string][] =
    mode === 'general'
      ? [
          ['Clarity', score.clarity, 'AI estimate'],
          ['Action language', score.action_language, 'AI estimate'],
          ['Structure', score.structure, 'AI estimate'],
          ['Completeness', score.completeness, 'AI estimate'],
        ]
      : [
          ['Keyword coverage', score.keyword_coverage, 'counted'],
          ['Skills alignment', score.skills_alignment, 'AI estimate'],
          ['Easy for hiring software (ATS) to read', score.formatting_compliance, 'AI estimate'],
        ];
  return (
    <Card>
      <T variant="title">Score breakdown</T>
      {rows.map(([label, value, how]) => (
        <View key={label} accessible accessibilityLabel={`${label}: ${value ?? 0} out of 100, ${how}`} style={styles.breakdownRow}>
          <View style={{ flexShrink: 1, flexGrow: 1, flexBasis: 180, gap: 2 }}>
            <T variant="heading" style={{ fontWeight: '500' }}>{label}</T>
            <T variant="footnote" tone="muted">{how}</T>
          </View>
          <T variant="heading" style={styles.tabular}>{value ?? 0}</T>
        </View>
      ))}
      <TextAction title="How is this scored?" onPress={onExplain} />
    </Card>
  );
}

function ReviewCard({ mode, assessment }: { mode: Mode; assessment: AssessmentData }) {
  const groups: [string, string[] | undefined][] = [
    ['What’s working', assessment.strengths],
    ['Quick improvements', assessment.quick_wins],
    [mode === 'general' ? 'What’s holding it back' : 'Gaps against the job', assessment.critical_gaps],
    ['What a recruiter might ask about', assessment.red_flags],
  ];
  return (
    <Card>
      <T variant="title">Recruiter-style review</T>
      {groups.map(([title, items]) =>
        items?.length ? (
          <View key={title} style={{ gap: Spacing.sm }}>
            <T variant="heading">{title}</T>
            <Bullets items={items} />
          </View>
        ) : null
      )}
    </Card>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  bigScore: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, overflow: 'visible', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  marker: { position: 'absolute', top: -4, bottom: -4, width: 2, marginLeft: -1 },
  move: { flexDirection: 'row', gap: Spacing.md, paddingTop: Spacing.sm },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: Spacing.xs },
  tabular: { fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '700' },
  docText: { fontSize: BodySize - 1, lineHeight: 23 },
  editor: { minHeight: 360, borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, fontSize: BodySize, lineHeight: 23 },
});
