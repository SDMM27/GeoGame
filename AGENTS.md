# GeoGame

Base branch: dev

Production branch: master (dev is promoted to master by a merge-commit PR).

## Product ideas

By default, use the devil's advocate subagent when the user proposes a new feature or a significant change to GeoGame.
Ask it to challenge the player value, tradeoffs, and smallest viable version, then include its main objection and your recommendation in the reply.
Skip this for routine fixes and straightforward follow-ups.

## Firestore rules and indexes (shipper)

The website, the app and their previews all use the same Firebase project (`geogame-sdmm`), and merging a PR does
not deploy `firestore.rules` nor `firestore.indexes.json`. The shipper deploys them itself when a delivery needs it:

- **When**: the PR merged to dev changed `firestore.rules` or `firestore.indexes.json`
  (`git diff --name-only <merge-base> <merge commit>`). Nothing to do otherwise.
- **Moment**: right after that PR is merged to dev and dev's CI after merge is green, **before** the promotion to
  master: rules first, then the clients (master deploys the site on Vercel and the app via EAS Update).
- **Command**, from an up-to-date checkout of `origin/dev` (Git Bash; the JDK isn't on PATH on this PC, and without
  the tmpdir option the Firestore emulator fails with "Unable to establish loopback connection"):

  ```bash
  J=$(ls -d "/c/Program Files/Eclipse Adoptium/"*/bin | head -1); JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\Users\Administrateur\jtmp' PATH="$J:$PATH" npm run deploy:rules
  ```

  Use `npm run deploy:indexes` for indexes only, `npm run deploy:firestore` for both. These scripts run `npm test` and
  the emulator rules tests before deploying, and stop if they fail. On another machine, adapt the JDK path; if
  `firebase` is not logged in, stop and ask the user to run `npx firebase login`.
- **Port 8080 busy** (Docker Desktop): copy `firebase.json` to `firebase.tmp-emulator.json` with the Firestore port
  set to 8085, run the tests with
  `npx firebase emulators:exec --config firebase.tmp-emulator.json --project geogame-sdmm --only firestore,auth "npx vitest run tests/emulator --no-file-parallelism"`,
  delete the copy, then `npx firebase deploy --only firestore:rules --project geogame-sdmm`.
- **Failure** (tests or deploy): do not promote to master; report the error to the orchestrator.
- **Report**: say whether the rules / indexes were deployed, and when.

Rules must stay compatible with the clients already in production (website, installed apps that update late): a
field or a write the old clients still make keeps being accepted for a while (see `legacyAnswers()` or
`legacyOpen()` in `firestore.rules`).
