# Refactor: Re-enabling Roboflow Dataset Upload

## Overview
The `roboflow_dataset_upload` block was removed from the Roboflow workflow to prevent `500 Internal Server Error` responses caused by hitting plan limits on the "Public Plan" during real-time inference (5-10 FPS).

This document outlines how to safely re-enable this feature for "Active Learning" without compromising API stability.

## Strategy: Throttled Data Collection
Instead of uploading every frame, use the **"Data Percentage"** setting to sample a small fraction of the traffic.

### Implementation Steps

1.  **Open Roboflow Workflow Editor**:
    - Navigate to the `extra-vision-ai` workflow in the Roboflow dashboard.
2.  **Add the "Roboflow Dataset Upload" Block**:
    - Insert the block after the model inference step (e.g., after the `SAM 3` block).
3.  **Configure Throttling (CRITICAL)**:
    - Locate the **"Data Percentage"** property in the block settings.
    - Set it to `1.0` (1% of frames) or `0.1` (0.1% of frames).
    - **Logic**: 
        - `1.0%` = Saves ~1 image every 10-20 seconds at 10 FPS.
        - `0.1%` = Saves ~1 image every 2-3 minutes at 10 FPS.
4.  **Set Usage Quotas**:
    - Configure the **"Minutely Usage Limit"** or **"Hourly Usage Limit"** within the block to act as a hard safety net against plan exhaustion.
5.  **Connect Inputs**:
    - **Image**: Link to the `$inputs.image`.
    - **Predictions**: Link to the output of the `rapid_model` (SAM 3).
6.  **Deploy**:
    - Save and click **Deploy** to push the changes to the production API.

## Benefits of Throttling
- **Stability**: Prevents the "Image Quota Exceeded" error that crashes the entire API call.
- **Cost Control**: Conserves Roboflow credits.
- **Data Diversity**: You collect representative samples from a drive rather than thousands of nearly identical redundant frames.

## When to Increase Percentage
Only increase the Data Percentage if:
1.  You have upgraded to a **Usage-Based** or **Enterprise** plan.
2.  You are hunting for extremely rare edge cases that occur only for split seconds.

