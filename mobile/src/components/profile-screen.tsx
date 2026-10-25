// Pro: a public profile page built from the resume, with a link the user can send anyone
// (recruiters, referees, visa officers). Everything beyond the basics is opt-in, and the user
// can take it down at any time from this phone.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Share, StyleSheet, TextInput, View } from 'react-native';

import { NativeButton, NativeSwitch } from '@/components/native';
import { ProLocked, ProPill } from '@/components/pro';
import { Bullets, Card, Notice, Pill, Screen, T } from '@/components/ui';
import { WorkingCard } from '@/components/working-card';
import { BodySize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractProfile, publishProfile, unpublishProfile } from '@/lib/api';
import { usePro } from '@/lib/entitlements';
import { countPlaceholders } from '@/lib/placeholders';
import { savePublished, usePublished } from '@/lib/published';
import { useSession } from '@/lib/session';
import type { ProfileData, PublishedProfile, PublishOptions } from '@/lib/types';

export default function ProfileScreen() {
  const { proResume: chosen, optimizeResult, buildResult } = useSession();
  // From the results' "Take it further", or else the latest resume made in this session
  const proResume = chosen || optimizeResult?.optimized_resume || buildResult?.resume || '';
  const { unlocked } = usePro();
  const { published, loaded } = usePublished();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [options, setOptions] = useState<PublishOptions>({ showEmail: false, allowCvDownload: false, openToWork: false });
  const [working, setWorking] = useState<'' | 'reading' | 'publishing'>('');
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);

  if (!unlocked) return <Screen><ProLocked feature="The shareable profile" onBack={() => router.navigate('/')} /></Screen>;
  if (!loaded) return null;

  if (working === 'reading') {
    return (
      <Screen>
        <WorkingCard title="Building your profile" steps={['Reading your resume', 'Picking out your roles, skills and education', 'Writing a short summary from what’s there']} />
      </Screen>
    );
  }

  // Already live and not making a new one: manage it
  if (published && !replacing) {
    return (
      <Screen>
        <PublishedCard published={published} />
        {proResume ? (
          <NativeButton label="Replace it with my latest resume" variant="outlined" onPress={() => setReplacing(true)} />
        ) : null}
      </Screen>
    );
  }

  if (!proResume) {
    return (
      <Screen>
        <Intro />
        <Card>
          <T variant="heading">Start with your resume</T>
          <T tone="muted">Your profile is made from a resume you’ve polished or built here. Do that first, then come back.</T>
          <NativeButton label="Polish my resume" onPress={() => router.navigate('/')} />
          <NativeButton label="Build a CV" variant="outlined" onPress={() => router.navigate('/build')} />
        </Card>
      </Screen>
    );
  }

  const placeholders = countPlaceholders(proResume);

  const read = async () => {
    setWorking('reading');
    setError('');
    try {
      setProfile(await extractProfile(proResume));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking('');
    }
  };

  const publish = async () => {
    if (!profile) return;
    setWorking('publishing');
    setError('');
    try {
      const res = await publishProfile(profile, proResume, options);
      // One live profile per phone: take the old one down once the new one is up
      if (published) unpublishProfile(published.slug, published.deleteToken).catch(() => {});
      await savePublished({ ...res, name: profile.name, publishedAt: new Date().toISOString() });
      setReplacing(false);
      setProfile(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t publish your profile. Please try again.');
    } finally {
      setWorking('');
    }
  };

  // Step 1: explain, then read the resume
  if (!profile) {
    return (
      <Screen>
        <Intro />
        <Card>
          <Bullets
            tone="soft"
            items={[
              'Only what’s in your resume. Nothing is added.',
              'You choose whether to show your email or let people download your CV.',
              'Hidden from search engines. Removed after 90 days, or whenever you take it down.',
            ]}
          />
        </Card>
        {placeholders > 0 ? (
          <Notice tone="placeholder">{`Fill in the ${placeholders} [bracket${placeholders === 1 ? '' : 's'}] in your resume first. A public page shouldn’t have gaps.`}</Notice>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}
        <NativeButton
          label={error ? 'Try again' : 'Build my profile'}
          onPress={read}
          disabled={placeholders > 0}
        />
        {placeholders > 0 ? (
          <NativeButton
            label="Fill them in"
            variant="outlined"
            onPress={() => router.navigate(buildResult && proResume === buildResult.resume ? '/build/result' : '/results')}
          />
        ) : null}
        {replacing ? <NativeButton label="Keep my current profile" variant="text" onPress={() => setReplacing(false)} /> : null}
      </Screen>
    );
  }

  // Step 2: preview and choose what to share
  return (
    <Screen>
      <T tone="muted">This is what people will see. Check it’s right before you publish.</T>
      <ProfilePreview profile={profile} options={options} />
      <StoryEditor value={profile.story ?? ''} onChange={(story) => setProfile((p) => (p ? { ...p, story } : p))} />

      <Card>
        <T variant="title">What to share</T>
        <NativeSwitch label="Show my email" value={options.showEmail} onValueChange={(v) => setOptions((o) => ({ ...o, showEmail: v }))} />
        <NativeSwitch label="Let people download my CV" value={options.allowCvDownload} onValueChange={(v) => setOptions((o) => ({ ...o, allowCvDownload: v }))} />
        <NativeSwitch label="Show I’m open to work" value={options.openToWork} onValueChange={(v) => setOptions((o) => ({ ...o, openToWork: v }))} />
        <T variant="footnote" tone="muted">
          {options.allowCvDownload
            ? 'Your CV includes your contact details, so anyone who downloads it will see them. '
            : ''}
          Anyone with the link can see this page. It’s hidden from search engines and removed after 90 days.
        </T>
      </Card>

      {error ? <Notice>{error}</Notice> : null}
      <NativeButton label="Publish my profile" onPress={publish} loading={working === 'publishing'} />
      <NativeButton label="Start again" variant="text" onPress={() => setProfile(null)} />
    </Screen>
  );
}

function Intro() {
  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <ProPill />
      </View>
      <View style={{ gap: Spacing.sm }}>
        <T variant="title" style={{ fontSize: 26, lineHeight: 31 }}>Your profile, one link away.</T>
        <T tone="muted">
          A clean public page of your experience, skills and education, made from your resume. Send the link to recruiters, referees or anyone who asks for your CV.
        </T>
      </View>
    </>
  );
}

/** "My story": written from the resume, then theirs to edit. Empty means the section isn't shown. */
function StoryEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const c = useTheme();
  return (
    <Card>
      <T variant="title">My story</T>
      <T variant="footnote" tone="muted">
        A short “About me” written only from your resume. Make it sound like you, or clear it to leave it out.
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        scrollEnabled={false}
        textAlignVertical="top"
        maxLength={2000}
        accessibilityLabel="My story"
        placeholder="A few lines about the work you do and what you’ve done."
        placeholderTextColor={c.textMuted}
        style={[styles.story, { color: c.text, borderColor: c.lineStrong, backgroundColor: c.background }]}
      />
    </Card>
  );
}

function ProfilePreview({ profile, options }: { profile: ProfileData; options: PublishOptions }) {
  return (
    <Card>
      <View style={{ gap: Spacing.xs }}>
        <T variant="title">{profile.name}</T>
        {profile.title ? <T tone="primary" variant="heading">{profile.title}</T> : null}
        {profile.location ? <T variant="subhead" tone="muted">{profile.location}</T> : null}
        {options.showEmail && profile.email ? <T variant="subhead" tone="muted">{profile.email}</T> : null}
      </View>
      {options.openToWork ? (
        <View style={{ flexDirection: 'row' }}>
          <Pill icon="check" label="Open to work" />
        </View>
      ) : null}
      {profile.summary ? <T tone="soft">{profile.summary}</T> : null}

      {profile.experience.length ? (
        <View style={{ gap: Spacing.md }}>
          <T variant="overline" tone="muted">EXPERIENCE</T>
          {profile.experience.map((e, i) => (
            <View key={i} style={{ gap: 2 }}>
              <T variant="heading">{e.title}</T>
              <T variant="subhead" tone="muted">{[e.company, e.period].filter(Boolean).join(' · ')}</T>
              {e.bullets.length ? <Bullets items={e.bullets} tone="soft" /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {profile.skills.length ? (
        <View style={{ gap: Spacing.sm }}>
          <T variant="overline" tone="muted">SKILLS</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
            {profile.skills.map((s) => <Pill key={s} label={s} tone="neutral" />)}
          </View>
        </View>
      ) : null}

      {profile.education.length ? (
        <View style={{ gap: Spacing.sm }}>
          <T variant="overline" tone="muted">EDUCATION</T>
          {profile.education.map((e, i) => (
            <View key={i} style={{ gap: 2 }}>
              <T variant="heading">{e.degree}</T>
              <T variant="subhead" tone="muted">{[e.institution, e.year].filter(Boolean).join(' · ')}</T>
            </View>
          ))}
        </View>
      ) : null}

      {profile.certifications.length ? (
        <View style={{ gap: Spacing.sm }}>
          <T variant="overline" tone="muted">CERTIFICATIONS</T>
          <Bullets items={profile.certifications} tone="soft" />
        </View>
      ) : null}
    </Card>
  );
}

/** The live profile: share, open, copy or take it down. */
function PublishedCard({ published }: { published: PublishedProfile }) {
  const [removing, setRemoving] = useState(false);

  const takeDown = () =>
    Alert.alert('Take your profile down?', 'The link will stop working for everyone straight away.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Take it down',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await unpublishProfile(published.slug, published.deleteToken);
            await savePublished(null);
          } catch (err) {
            Alert.alert('Couldn’t take it down', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);

  return (
    <Card>
      <View style={{ flexDirection: 'row' }}>
        <Pill icon="check" label="Live" />
      </View>
      <T variant="title">{published.name}’s profile</T>
      <T tone="primary" selectable>{published.url}</T>
      <T variant="footnote" tone="muted">
        Published {new Date(published.publishedAt).toLocaleDateString()}. Removed automatically after 90 days.
      </T>
      <NativeButton
        label="Share my link"
        onPress={() => Share.share({ message: `My profile: ${published.url}`, url: published.url }).catch(() => {})}
      />
      <NativeButton label="See it as others do" variant="outlined" onPress={() => WebBrowser.openBrowserAsync(published.url)} />
      <NativeButton
        label="Copy link"
        variant="outlined"
        onPress={async () => {
          await Clipboard.setStringAsync(published.url);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Alert.alert('Copied', 'Your profile link is on the clipboard.');
        }}
      />
      <NativeButton label="Take it down" variant="text" onPress={takeDown} loading={removing} />
    </Card>
  );
}

const styles = StyleSheet.create({
  story: { minHeight: 140, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: BodySize, lineHeight: 22 },
});
