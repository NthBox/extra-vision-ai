# Debug & Troubleshoot: Live Feature Disabled for Release

## Issue: Live (WebRTC) Feature Unstable for Current Release
- **Context**: Live real-time streaming via WebRTC is disabled for the current release. The feature will be re-enabled once WebRTC/connectivity works reliably (see `webrtc-connectivity-cellular-xfinity-debug-troubleshoot.md`, `webrtc-data-channel-null-predictions-debug-troubleshoot.md`).
- **Goal**: Ship release with manual inference (PLAY/PAUSE + YOLO/SAM3) only; hide LIVE entry points so users cannot trigger broken flows.

## Debug Methods
- **Code Search**: Located all LIVE UI and logic via `Grep` for `live`, `Live`, `LIVE`, `isRealTimeEnabled`, `isStreaming` in `src/components/`.
- **Call Sites**: Identified (1) `CameraScreen.tsx`: live stream branch (RTCView vs CameraView), LIVE button, (2) `HUDOverlay.tsx`: LIVE badge when `isStreaming`.

## Troubleshoot Methods
- **Non-Destructive Disable**: Commented out UI and the camera-container branch that chooses RTCView vs CameraView. Did **not** remove store fields, `useRealTimeInference()`, or `RTCView` imports so re-enable is a simple uncomment.
- **Consistent Comment Tag**: All disabled blocks use the same leading comment: `LIVE FEATURE DISABLED FOR RELEASE - re-enable when WebRTC/live works`. Search for this string to find every block to uncomment.

## Approaches That Worked
- **Comment blocks, keep wiring**: Comment only the UI and the conditional that switches to the live view. Leave `isRealTimeEnabled`, `setRealTimeEnabled`, `isStreaming`, and the real-time hook in place so behavior is “live path never used” without refactors.
- **Single re-enable marker**: One searchable phrase (`LIVE FEATURE DISABLED FOR RELEASE - re-enable when WebRTC/live works`) in each commented block makes re-enable a single global search-and-uncomment step.

## Files Touched (for re-enable)
| File | What was commented |
|------|--------------------|
| `src/components/CameraScreen.tsx` | (1) Camera container branch `isRealTimeEnabled ? (RTCView / initializing) : (CameraView)` – left only `CameraView` active; (2) LIVE button `TouchableOpacity` in bottom bar |
| `src/components/HUDOverlay.tsx` | LIVE badge (`isStreaming && <G>…LIVE…</G>`) in the SVG overlay |

## Prevention / Lessons for Future
- **Feature flags via comments**: For “disable for release, re-enable later,” a shared comment tag on all disabled blocks is easier to restore than deleting code or scattering one-off flags.
- **Do not remove hooks or store**: Keeping `useRealTimeInference()` and real-time store fields avoids re-introducing bugs when uncommenting and keeps the app building without new dead-code paths.
- **Append, don’t overwrite**: When adding new debug/troubleshoot notes to this doc, append under the relevant sections above; do not delete or overwrite prior logs.
