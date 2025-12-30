# Troubleshooting: Native Vision Tracker Limit and Stability

## Issue Description
- **Symptoms**: Manual mode tracking worked briefly then stopped. Tracking boxes would disappear prematurely. Constant re-seeding caused flickering.
- **Error**: `[EVAI] Tracking execution error: Error Domain=com.apple.Vision Code=9 "Internal error: Exceeded maximum allowed number of Trackers for a tracker type: VNObjectTrackerRevision2Type"`
- **Context**: Occurred in "Manual Mode" when seeding the tracker from server-side or CoreML detections.

## Debugging Methods
1. **Xcode Log Analysis**: Identified Apple Vision Error Code 9, which indicates the framework reached its internal limit for concurrent trackers.
2. **Worklet Logging**: Added `console.log` in the frame processor worklet to track when `seeds` were being passed and how many results were returned.
3. **Native Logging**: Added `NSLog` in Swift to monitor `resetTrackers` frequency and the raw type of incoming JSI data.
4. **Observation**: Noticed that "Seeding tracker" logs were appearing multiple times per frame, indicating the `pendingSeeds` were not being cleared fast enough.

## Troubleshooting Methods
1. **Resource Management**: Checked if `VNTrackObjectRequest` objects were being properly released. Found that just removing them from a Swift array does NOT release the underlying Vision resource.
2. **State Sync**: Investigated the timing between JS `pendingSeeds` assignment and the Worklet's consumption.
3. **Data Validation**: Checked the normalized coordinates being passed to Vision; discovered that slightly out-of-bounds values (e.g., negative or > 1.0) could cause tracker failure.

## Approaches That Worked

### 1. Explicit Tracker Cancellation (Native)
Added explicit `.cancel()` calls to every `VNTrackObjectRequest` before removing it from the tracking array.
```swift
for trackedObj in _trackedObjects {
  trackedObj.request.cancel()
}
_trackedObjects.removeAll()
_sequenceHandler = VNSequenceRequestHandler() // Reset the handler state
```

### 2. Immediate Seed Invalidation (JS/Worklet)
Moved the clearing of `pendingSeeds.value = null` to happen **immediately** when the worklet consumes them, rather than after the plugin call. This prevents subsequent frames in the same "burst" from triggering redundant resets.

### 3. Rate-Limiting Resets (JS & Native)
Implemented a 100ms minimum interval (`MIN_RESET_INTERVAL`) for seeding on both sides. This ensures that even if detections arrive rapidly, the tracker isn't constantly thrashing.

### 4. Robust Error Recovery (Native)
Added a specific catch block for Vision Error Code 9 to perform a "hard reset" of the tracking state, allowing the system to recover without an app restart.

### 5. Bounds Validation and Clamping
Added strict clamping and validation for tracking bounds in `getTrackerResults` to prevent the tracker from failing due to invalid coordinate math.

## Lessons Learned & Prevention
- **Vision Lifecycle**: `VNTrackObjectRequest` is a heavy resource. Always call `.cancel()` explicitly when discarding a request.
- **Worklet Concurrency**: SharedValues in Reanimated/Worklets can be accessed by multiple frames before the "clear" logic at the end of a worklet executes. Always clear state-triggering values as early as possible.
- **Rate Limit Expensive Ops**: Operations that reset hardware-accelerated state (like Vision trackers) should always be rate-limited to prevent internal framework overflows.
- **Retry Logic**: When seeding a tracker, it might take 1-2 frames for the first observation to populate. Don't clear the UI detections immediately on the first empty result after a seed; allow a small "grace period" (failure count) for the tracker to stabilize.

## Status
- **Resolved**: Dec 29, 2025
- **Outcome**: Manual mode tracking is stable, recovers from errors, and no longer hits the maximum tracker limit.
