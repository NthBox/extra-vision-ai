# Debug & Troubleshooting: App Store Releases

- Debug methods
  - Review EAS logs during build and submission for any certificate/provisioning errors.
  - Check App Store Connect messages for rejected builds or metadata issues.
  - Verify that the iOS bundle identifier in `app.config.js` matches the App Store Connect app.
- Troubleshooting methods
  - Re-run `npx eas credentials -p ios` to refresh distribution certificates and provisioning profiles.
  - Ensure `eas.json` production profile exists and uses the correct environment (APP_ENV=production).
  - Clear and re-create App Store Connect credentials if needed; validate certificates are valid for all required apps.
  - Use `npx eas build -p ios --profile production` before submission to ensure a clean archive.
- Approaches that worked
  - Keep credentials in a secure store; use `--latest` with `npx eas submit` to submit the most recent build.
  - Validate the App Store Connect app ID and bundle ID alignment prior to submission.
- Remember
  - Document every debugging step and its outcome to prevent recurrence.
  - Update CHANGELOG and README deployment notes with the resolution and steps taken.

