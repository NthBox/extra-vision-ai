# Debug & Troubleshooting: Roboflow 500/404 API Errors

## Issue Description
- **Symptoms**:
  - Initial error: `500 Internal Server Error` with message `"Internal error."` when calling the Roboflow Workflow API.
  - Secondary error: `404 Not Found` after renaming the workflow in the dashboard.
- **Context**: Real-time dashcam inference (5-10 FPS) using SAM 3 model via Roboflow Serverless Workflows and a Cloudflare Worker proxy.

## Debug Methods Used
1.  **Direct Node.js Test Scripts**: Created `test-image-direct.js` and `test-roboflow-api.js` to isolate the API call from the mobile app and proxy logic.
2.  **Bash Scripts & Curl**: Used `curl` commands with verbose output (`-v`) to inspect headers and verify API key authentication.
3.  **Browser-MCP**: Used the browser tool to visually inspect the Roboflow Workflow dashboard, verifying block configurations and connection states.
4.  **Cloudflare Logs**: Monitored `npx wrangler tail` to see the proxy's interaction with Roboflow in real-time.

## Troubleshooting Process
1.  **API Key Verification**: Confirmed key authentication via `https://api.roboflow.com/?api_key=...`.
2.  **Webhook Sink Isolation**: Identified a `notify_roboflow` (Webhook Sink) block with an empty URL. Deleting this reduced potential failures.
3.  **Plan Limit Check**: Identified the `roboflow_dataset_upload` block was active on a Public Plan. High-frequency uploads were likely hitting storage/rate limits, causing 500 errors in the serverless runner.
4.  **Workflow ID Investigation**: The original workflow ID was extremely long (~200 chars). Suspected routing or truncation issues at the API gateway level.

## Approaches That Worked
1.  **Renaming the Workflow ID**: Renamed the unique URL in the Roboflow dashboard to a short, slug-friendly ID: `extra-vision-ai`. This immediately resolved the "Internal error" (500) once the endpoint was updated.
2.  **Sink Removal**: Deleted both the Webhook Sink and Dataset Upload blocks. This simplified the execution graph to Model -> Visualization -> Output, reducing latency and avoiding plan limit crashes.
3.  **Configuration Sync**: Updated `wrangler.toml` and all test scripts to reflect the new `extra-vision-ai` ID.

## Lessons Learned & Prevention
- **Keep IDs Short**: API Gateways and serverless routers can sometimes behave unpredictably with extremely long path parameters.
- **Throttling is Mandatory**: Never use a "Dataset Upload" sink at high FPS on a limited plan without a "Data Percentage" filter (set to 0.1% or 1%).
- **Isolate Sinks**: If a workflow fails with a 500 error but the model is fine, check the "Sinks" (webhooks, uploads) first.
- **Environment Sync**: Renaming a resource in a 3rd-party dashboard (Roboflow) requires an immediate redeploy of environment variables in the proxy (Cloudflare).

