Yes—use Roboflow InferencePipeline to process live video streams in real time.

Your hosted workflow API example is for single-image POSTs, but Roboflow supports real-time streaming via the Inference SDK. Use the Python InferencePipeline to read from webcams, HTTP image endpoints, or RTSP cameras, and apply your model frame-by-frame, with sinks for rendering, counting, or custom logic. This is documented for single and multi‑camera setups, including RTSP streams. ​⁠￼ ​⁠￼ ​⁠￼

If you want the simplest path: keep your model in Roboflow and run it in real time with InferencePipeline, specifying your model/workflow ID, API key, and a video_reference (e.g., an RTSP URL).

Yes—Roboflow’s real-time pipelines are Python-first; there isn’t a TypeScript InferencePipeline.

On your page, the JavaScript example uses fetch against the hosted workflow for single-image requests. Roboflow’s streaming/RTSP, multi‑camera, and frame‑by‑frame pipelines are provided via the Python InferencePipeline. You can still build TypeScript apps that consume real-time results by running the Python pipeline (edge or server) and sending detections to your TS/Node frontend over WebSocket/HTTP, or by polling a stream endpoint you expose. For purely browser/Node TypeScript, use the @roboflow/inference JS client for batch/single-frame calls; it doesn’t offer the Python-style pipeline abstractions for RTSP yet.

Yes—your Expo iOS app can integrate via Cloudflare; use a proxy for real time.

You have two workable patterns with your stack:

Option 1: Direct HTTPS calls from Expo (single-frame or burst) ￼

Use Expo’s camera to grab frames and POST them to your Roboflow Workflow API. Wrap calls behind a Cloudflare Worker so your API key stays server-side and you avoid CORS surprises. This works well for “snapshots” or modest bursts; latency is typically fine for UX that doesn’t need per-frame inference.

- Flow: Expo Camera → Cloudflare Worker (adds API key) → Roboflow serverless workflow → Worker → App.

- Notes:

 ▫ Send images as a URL or base64; keep payloads small (JPEG, sensible resolution).

 ▫ Respect Cloudflare Worker limits on body size and CPU time; stream smaller frames at a steady cadence.

 ▫ Use HTTPS fetch in Expo; no native modules required.

Option 2: Real-time streaming via a Python inference service behind Cloudflare ￼

Roboflow’s InferencePipeline is Python-first. Run it on a server (or edge box) and front it with Cloudflare (Workers/Zero Trust/Argo), then push detections to your Expo app over WebSocket/SSE.

- Flow: Expo Camera → your backend (WebRTC/WebSocket/HTTP frames) → Python InferencePipeline → detections/events → Cloudflare → Expo client.

- Why: True per-frame processing, multi-camera, RTSP, and pipeline sinks (rendering, counting) live in Python today, not TypeScript.

- Notes:

 ▫ Keep the Roboflow API key off-device; store it in the backend.

 ▫ Use Cloudflare as your secure ingress/egress and for fan-out to clients.

 ▫ If you need on-device-only, stick to Option 1 (no Python pipeline in RN/Expo).

Practical setup details ￼

- Expo iOS camera: Use expo-camera; downscale to ~640–960 px on the long edge to balance latency and accuracy.

- Transport:

 ▫ For Option 1, POST frames every N ms (e.g., 4–10 FPS) to a Cloudflare Worker that forwards to the Roboflow workflow.

 ▫ For Option 2, send frames to your backend via WebSocket or WebRTC; return detections via a real-time channel.

- Security: Never ship the Roboflow API key in the app. Cloudflare Worker or your backend injects it.

- Costs/limits: Roboflow workflows are billed per image; streaming many frames is effectively many requests. Tune frame rate and resolution.

- Caching/latency: Use Cloudflare for regional proximity and to normalize CORS. Expect sub-300 ms per request in Option 1 if frames are small; Option 2 can reach real-time with sustained throughput.

In short, with Expo React on iOS plus Cloudflare, single-frame/burst inference works out of the box via HTTPS. For true streaming pipelines, run the Python InferencePipeline server-side and relay results to your app through Cloudflare.

Yes—you can run the Python InferencePipeline in Cloudflare’s container environment.

You won’t run it in Workers (no long‑running GPU/FFmpeg there), but Cloudflare’s containerized compute like Cloudflare Workers AI with Containers or Cloudflare’s Cloudflare Calls + Durable Objects patterns can host a container service behind Cloudflare’s network. The practical approach is to package a Python service (Inference

Yes—Cloudflare Containers can host a Python InferencePipeline for real-time streaming.

Cloudflare now offers a container runtime you control from a Worker, so you can run a Python service (with OpenCV/FFmpeg and your Roboflow pipeline) inside a container, keep sessions routed via the Worker, and stream detections back to your Expo iOS app over WebSockets/SSE. Containers provide a full Linux-like environment, per-instance ports, and configurable sleep timeouts, making them suitable for long-lived, stateful streaming workloads; Workers handle the global routing, auth, and fan-out. ​

Key constraints and fit:

- No custom GPUs in Containers; use CPU-only inside the container. If you need GPU inference, that’s via Workers AI as a managed service (not your own image). ​⁠￼

- Instance sizing tops out at multiple vCPUs and several GB of RAM; pricing is per active CPU/memory time with sleep-to-zero when idle. ​⁠￼

- For live transport, use WebSockets through your Worker, or Cloudflare Realtime (TURN/SFU/SDKs) if you need WebRTC media routing; your inference service remains in a container, and the Worker coordinates streams and sessions. ​⁠￼

A practical architecture with your stack:

- Expo iOS camera → Worker (auth/proxy) → Containerized Python InferencePipeline (RTSP/HTTP frames, per-session instance) → detections back via Worker WebSocket/SSE to Expo.

- Keep your Roboflow API key server-side (Worker/container). Tune frame resolution/FPS for latency and cost, and set container sleepAfter to avoid unwanted shutdowns during sessions.

No—processing RTSP/webcam streams isn’t limited to Python.

Roboflow’s “InferencePipeline” and many turnkey streaming examples are Python-first, but you can process live video in other languages and runtimes. The core requirements are reading a stream (RTSP/Webcam), decoding frames (e.g., FFmpeg/OpenCV/GStreamer), running your Roboflow model per frame, and emitting results over a realtime channel.

- JavaScript/TypeScript: Use Node with ffmpeg or libs like fluent-ffmpeg, node-opencv, or WebRTC getUserMedia in the browser. Call your Roboflow workflow per frame or batch, or host your own inference and stream results via WebSockets/SSE.

- Go/Rust/C++: Use GStreamer/FFmpeg bindings to ingest RTSP and run inference; then expose a WebSocket/HTTP API your app consumes.

- Cloudflare Containers: Run any language that can decode RTSP and call your model. Workers handle routing/auth; Containers host the long-lived stream processor. If you need WebRTC media routing, combine with Cloudflare Realtime.

Python just has the most complete, ready-made pipeline abstractions today; the pattern itself is language-agnostic.
