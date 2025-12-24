# Manual Detection Cadence Debug Troubleshoot

This document records debugging steps, strategies, and learnings for speeding up the manual (non-real-time) object detection cadence.

## Debug methods
- Instrument cadence measurements around the manual loop (capture + inference) to establish baseline timings.
- Log per-frame timing: time to capture image, time to encode base64, network latency to inference server, and total end-to-end frame time.
- Validate that the current UI loop cadence is not being throttled by the device (battery saver, frame rate caps, etc.).

## Troubleshooting methods
- Reduce image payload progressively:
  - Decrease quality and scale (e.g., reduce from 0.3/0.5 to smaller values).
- Adjust capture cadence:
  - Test at 40ms per frame, 30ms per frame, and 20ms per frame to observe breaking points.
- Check network path to the inference server (INFERENCE_WORKER_URL):
  - Confirm server is responsive and not a bottleneck.
- Evaluate inference server-side:
  - Ensure inference time is not dominating; consider batching or stream-based approaches for speed.
- Validate camera capabilities and device performance:
  - Confirm that camera hardware can support rapid captures without errors.

## Approaches that worked
- Reducing per-frame payload by lowering `quality` and `scale` in `CameraScreen.tsx` to speed up encoding and transfer.
- Lowering the manual cadence to approximately 40ms per frame, which reduced the total loop time while maintaining functional detection cadence.
- Keeping the non-real-time path separate from the real-time streaming path to avoid cross-impact between modes.

## Remember for future projects
- Always profile per-frame timing before optimizing cadence.
- Prioritize user-perceived responsiveness (UI feedback, progress indicators) when optimizing loops.
- Prefer adjustable cadences with safe fallbacks to prevent overloading the device or network.


