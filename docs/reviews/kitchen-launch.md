# Test Kitchen bare launch

Ledger 19; branch `sol/kitchen-launch`; base `4132c4ac3e30e170816e00f85eb2ea7041dab340`.

Bare launch previously replaced the route with `/play`, dropping `?kitchen=1`. `startGamePath` now reuses the existing `isStartLink` eligibility check and preserves only the known kitchen query switch as `/play?kitchen=1`. GitHub Pages base paths and native bare links use the same eligibility rules. Fragment switches and nested destination parameters cannot opt into kitchen mode. Auth callback parameters still prevent automatic game launch, and deep links keep their destination. The hook continues using its captured launch URL and existing once-only `router.replace` behavior.

Read the SDK 57 [Expo Router reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/) and [URL parameters guide](https://docs.expo.dev/router/reference/url-parameters/) before changing the router call. No Expo/React Native API or dependency was added.

Validation: all eight start-link tests passed, including five unchanged existing tests and three new kitchen launch tests. Typecheck, targeted ESLint and diff whitespace checks passed. The parent owns the full real slice verification; the UI worker owns the bare-launch browser check. Database, balance and browser tests were not duplicated locally.
