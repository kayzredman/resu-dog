# Resu-Dog — Merged design spec (A "Coach" × B "Clarity")

Merged from the UI-agent and QA-agent reviews of the two directions on the [design canvas](https://claude.ai/artifact/6AgibkvRLjTSYKMjeLw7Te).

**In one line:** A's warm green voice and its "Your next 3 moves" coaching, laid out with B's structure: a two-input form, a segmented results view and visible working. Native controls throughout.

## Principles
1. **Honest by design.** Every score is labelled an *estimate* and links to "How is this scored?". Never promise a "shortlist". Placeholders are counted from the text, never by a checkbox the user can tick.
2. **One clear action per screen.** Form first, one primary button, and the "No resume?" path one tap away.
3. **Native first.** System tab bar, native stack headers, and `@expo/ui` controls (SwiftUI on iOS, Jetpack Compose on Android). SF Symbols on iOS, Material Symbols on Android. System fonts, so Dynamic Type and font scaling work.
4. **Colour is never the only signal.** Every status has a word, every placeholder has [brackets] and an underline, every success has a check.

## Colour tokens (WCAG AA verified)

| Token | Light | Dark |
| --- | --- | --- |
| background | #F5F6F1 | #0F1411 |
| surface | #FFFFFF | #1A211C |
| surfaceMuted | #EEF0EA | #242C26 |
| line (decorative) | #E1E5DC | #2C352F |
| lineStrong (input borders, ≥3:1) | #858F88 | #6A766E |
| text | #16201A | #E8ECE9 |
| textMuted | #55605A | #9AA59E |
| primary (fill, white text) | #1D6B47 | #1F7A50 |
| primaryInk (text) | #1D6B47 | #6FCF9C |
| primaryTint | #E5F0E9 | #1E3328 |
| placeholder bg / text / underline | #FDF1D6 / #6B4800 / #8A5E00 | #3D2E0A / #FBD98A / #FBD98A |
| danger | #B4441F | #F2937A |

Key ratios:
- **Text:** 15.4 / 15.6
- **Muted text:** 6.03 / 7.31
- **White on primary:** 6.47 / 5.31
- **primaryInk:** 5.96 / 9.82
- **Placeholder text:** 7.34 / 9.66
- **Input borders:** 3.08 or more
- **Danger:** 5.11 or more

## Type and spacing
- **Fonts:** system fonts only.
- **Type scale:**
  - Large title: 34/700, native
  - Title: 22/700
  - Headline: 17/600
  - Body: 17 on iOS, 16 on Android
  - Subhead: 15
  - Footnote: 13
  - Caption: 12 minimum
  - Score: 56/800, tabular figures
- **Spacing:** 4 · 8 · 12 · 16 · 20 (gutter) · 24 · 32.
- **Radius:** 4 · 8 · 12 · 16 · pill.
- **Touch targets:** 48 minimum.

## Information architecture

| Tab | SF Symbol | Material |
| --- | --- | --- |
| Optimize | `doc.text.magnifyingglass` | `find_in_page` |
| Build CV | `square.and.pencil` | `edit_note` |
| About | `info.circle` | `info` |

### Optimize, top to bottom
1. Large title "Optimize", with a Help button in the header that opens a "How it works" sheet.
2. Headline: "Let's make your resume work harder."
3. The promise line.
4. Segmented control: **For a job / Just polish**.
5. Resume row (file name, size, Change), or a "Tap to choose your resume" area.
6. Job description field with an `n / 15,000` counter and a truncation warning. Shown in job mode only.
7. The primary button, with "Usually 1–2 minutes · nothing is saved" under it.
8. "No resume yet? Answer a few questions" link row.

### During a run
- Honest stage list with an elapsed timer.
- "Keep Resu-Dog open. If you leave, we may need to start again."
- On failure the file and job description are kept, so retry is one tap.

### Results
1. Segmented control: **Overview / Resume / Letter**. Letter appears in job mode only.
2. **Overview:**
   - Fit pill ("Good fit on paper")
   - Score, labelled "estimated match" or "estimated quality"
   - Before → after bar with "+28"
   - "How is this scored?" sheet
   - **Your next moves**, worked out from the data: placeholders, then the top gap, then the letter
   - Skill chips with words ("· matched", "· close", "· to learn")
   - Sub-scores marked *counted* or *AI estimate*
   - Strengths, gaps, things a recruiter might ask about, and suggested plans
3. **Resume:** banner counting the placeholders, the text with highlighted [brackets], an Edit option, and what changed.
4. **Letter:** the text, also with placeholder warnings.
5. **Actions:**
   - "Save or share PDF" and "Copy", which both warn if placeholders remain.
   - Note: "Results clear when you close the app — save your PDF."

### Build CV
Job description, then questions grouped by section, with fields marked "Required" in words. "Help me write this" gives drafts with [brackets]. The result reuses the Results view, without the Letter tab.

### About
Our promise · How the score works · Your data (and the privacy policy) · Version.

## Native controls (`@expo/ui`)
- **Buttons:** universal `Button` (iOS: `borderedProminent` / `bordered`; Android: Material `Button` / `OutlinedButton`).
- **Segmented control:** `@expo/ui/community/segmented-control` (iOS: UISegmentedControl; Android: SegmentedButton).
- **Sheets:** universal `BottomSheet`.
- **Icons:** universal `Icon` with `Icon.select({ ios: SF Symbol, android: Material Symbol })`.
- **Kept as React Native views:** resume text with inline highlights, the score numeral, wrapping chips, multiline text fields and the progress card.

## Future / dropped
- **Future:** saved CVs, accounts, importing a job from a link, a line-by-line diff (needs an API change), and full gap-plan screens.
- **Dropped:** Profile/Saved tabs, custom-drawn tab bars, "MOST POPULAR", any "shortlist" promise, "About 1 minute", and the extra fonts in the app.

## Acceptance tests (from QA)
1. No screen says Profile, Saved, My CVs, account or sign-in.
2. With no file chosen, the primary button is disabled and the reason is shown in text.
3. A file of the wrong type or over 10 MB shows an inline error naming the limit.
4. Pasting more than 15,000 characters shows a truncation warning, and the counter shows n / 15,000.
5. During a run, an elapsed timer and stage list show, and the screen does not sleep.
6. Offline submit shows a clear error with retry, and the inputs are kept.
7. Backgrounding mid-run gives either the result or a clear error, never an endless spinner.
8. A server error or timeout shows a plain-language message and retry.
9. Copy, Save PDF and Share all warn when placeholders remain, in both the resume and the letter.
10. The placeholder count comes from the text.
11. No copy says "shortlist", "guarantee" or "the way a recruiter does"; scores are labelled estimates and link to an explanation.
12. Text meets 4.5:1 and borders meet 3:1, in both themes.
13. Touch targets are at least 44pt on iOS and 48dp on Android.
14. Screen readers announce skill status in words, the score as "74 out of 100", and placeholders as fill-in prompts.
15. At the largest text sizes nothing is clipped, and metric rows stack.
16. With reduced motion on, nothing animates except opacity.
17. Native tab bar and headers on both platforms; back works everywhere.
18. General-polish results never say "job match".
19. "No resume?" is one tap from the main screen.
20. The results screen says results clear when the app closes.
