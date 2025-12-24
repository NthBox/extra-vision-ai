# extra-vision-ai
AI Vision segmentation and tagging/boxing

### Deployment checklist (TestFlight)

- Prerequisites
  - Install EAS CLI: `npm i -g eas-cli` (or use `npx eas` to avoid global install)
- Build
  - `npx eas build -p ios --profile production`
- Submit
  - `npx eas submit -p ios --latest`
- Post-submit
  - Monitor App Store Connect for processing
  - Add testers and notes in TestFlight as needed

- Notes
  - Ensure the iOS bundle identifier matches `app.config.js` (e.g., `com.extravisionai.app`).
