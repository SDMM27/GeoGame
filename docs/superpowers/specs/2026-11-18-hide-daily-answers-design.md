# Hide today's daily answers from players who haven't played

## Problem

Today's daily leaderboards (website and app) show other players' answers. Anyone can open the
leaderboard, read the solution, then play and win:

- Border Guess, Country Clue, Voyage Voyage, Geo Quiz daily: `daily_scores.guesses` (the last guess is the answer),
  shown in `DailyLeaderboard`.
- Country Ranking: `daily_scores.playerOrder`, shown in `RankingLeaderboard`.
- Daily Challenge: the leaderboard rows open on `ChallengeRoundList`, built client-side from the day's rounds
  (`challengeRounds(dailyKey)`), which shows the 12 answers.

Country of the Day is not affected (its rows only show tries per step).

`daily_scores` is `allow read: if true`, so hiding the fields in the UI is not enough: anyone can read them in
Firestore directly.

## Rule

For **today's** leaderboard, answers are shown only to a **signed-in** player who has **saved their own score for
that game today**. Signed-out visitors never see them. Past days stay fully visible to everyone (the day is over).
Everything else of a row (rank, name, score, attempts, time, hints count, map assist) stays visible.

## Data

New collection, not publicly readable: `daily_answers/{dailyKey}/{gameType}/{entryId}`

- `entryId`: the account's uid, or `v_<scoreId>` for a visitor's score.
- Fields: `{ scoreId, uid?, guesses? (list of strings, ≤ 600), playerOrder? (list, ≤ 5) }`.
- Written right after the score is created (the score first, then the answers, as two separate writes: if the answers
  write fails, the score is still saved; the failure is only logged).

Rules (`firestore.rules`):

- `read` (get and list): the day is over (`request.time >= dailyKey's date + 1 day`, Paris days end before that
  in UTC), or `request.auth != null` and
  `exists(/daily_answers/$(dailyKey)/$(gameType)/$(request.auth.uid))`.
  `dailyKey` must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` before being parsed.
- `create` only: `scoreId` points to an existing `daily_scores` doc (`get`) with the same `gameType` and `dailyKey`;
  for an account entry, `entryId == request.auth.uid` and that score's `uid == request.auth.uid`; for a visitor entry,
  `entryId == 'v_' + scoreId` and that score has no `uid`. Keys limited to the ones above, list sizes capped. No
  update, no delete.
- `daily_scores`: new clients no longer write `guesses` / `playerOrder` there. During a transition the rules still
  accept them (apps not yet updated), until `timestamp.date(2026, 12, 15)`; after that date a score with those fields
  is refused. Same pattern as `legacyOpen()` for rooms.

Why a player's own entry proves they played: a daily score is never replaced (no `update` rule), so unlocking the
answers burns the player's daily.

## Client

Shared code in `src/utils` (the app uses it through `@shared`):

- `saveDailyScore` / `saveRankingScore`: write the score without `guesses` / `playerOrder`, then the
  `daily_answers` entry (only when a score was created, not when `blocked`).
- `fetchDailyAnswers(gameType, dailyKey)`: lists the day's entries, returns a map scoreId → `{ guesses, playerOrder }`,
  or `null` when Firestore refuses (`permission-denied`): locked.
- `hasPlayedDaily(uid, gameType, dailyKey)`: whether the player has a `daily_scores` entry for that day (used by the
  Daily Challenge, which has no `daily_answers`).
- A hook used by the three leaderboards, website and app: given the viewed day, today's key, the account and the
  leaderboard refresh key, returns `{ locked, answers }`. Past day → never locked. Today without account → locked,
  no request. Today with account → fetch (or `hasPlayedDaily` for the challenge); refreshed when the leaderboard
  refreshes, so finishing the game unlocks it.

A row's answers: the `daily_answers` entry for that score; fallback to the legacy `score.guesses` / `score.playerOrder`
**only when not locked**. When locked, the row's detail shows a lock message instead of the answers / round list:

- signed in: "🔒 Termine le défi du jour pour voir les réponses des autres joueurs."
- signed out: "🔒 Connecte-toi et termine le défi du jour pour voir les réponses des autres joueurs."

In the 9 languages of `src/i18n/locales` (fr, en, es, pt, de, it, nl, ru, uk).

## Deploy order

Rules first (`npm run deploy:rules`), then the clients. Both orders are safe: old rules refuse the answers write
(score still saved), new rules still accept the old fields until the cutoff.

## Not covered

- The day's puzzle is computed client-side from the date: a player able to read the JS bundle can find it. Out of
  scope.
- A second account can still be used to unlock the answers.
- Today's scores already saved before the deploy keep their `guesses` in `daily_scores` until the day ends.
