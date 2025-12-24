export interface Env {
  ROBOFLOW_API_KEY: string;
  ROBOFLOW_WORKSPACE: string;
  ROBOFLOW_WORKFLOW_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Handle CORS pre-flight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. WebRTC TURN Configuration
    if (pathname === "/v1/webrtc-turn-config") {
      try {
        const roboflowUrl = `https://api.roboflow.com/webrtc_turn_config?api_key=${env.ROBOFLOW_API_KEY}`;
        const response = await fetch(roboflowUrl);
        
        let iceServers: any[] = [];
        
        if (response.ok) {
          const data = await response.json() as any;
          
          // Handle different response formats from Roboflow
          if (Array.isArray(data)) {
            iceServers = data;
          } else if (data.iceServers && Array.isArray(data.iceServers)) {
            iceServers = data.iceServers;
          } else if (data.urls) {
            iceServers = [data];
          }
        }
        
        // Always include default STUN servers as fallback
        const defaultStun = [
          { urls: ["stun:stun.l.google.com:19302"] },
          { urls: ["stun:stun1.l.google.com:19302"] }
        ];
        
        // Combine TURN servers (if any) with STUN fallbacks
        const allServers = iceServers.length > 0 
          ? [...iceServers, ...defaultStun]
          : defaultStun;
        
        return new Response(JSON.stringify({ iceServers: allServers }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      } catch (error: any) {
        // Return default STUN servers on error
        return new Response(JSON.stringify({ 
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: ["stun:stun1.l.google.com:19302"] }
          ]
        }), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      }
    }

    // 3. Streaming Session Initialization
    if (pathname === "/v1/stream/init" || pathname.startsWith("/v1/stream/init")) {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required" }), {
          status: 405,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      try {
        const { offer, wrtcParams } = await request.json() as any;
        
        // Ensure we have valid workspace and workflow IDs
        const workspace = (wrtcParams.workspaceName && wrtcParams.workspaceName !== 'n-a') 
          ? wrtcParams.workspaceName 
          : env.ROBOFLOW_WORKSPACE;
          
        const workflowId = (wrtcParams.workflowId && wrtcParams.workflowId !== 'n-a')
          ? wrtcParams.workflowId
          : env.ROBOFLOW_WORKFLOW_ID;

        const workflowConfig: any = {
          type: "WorkflowConfiguration",
          image_input_name: wrtcParams.imageInputName || "image",
          workflows_parameters: wrtcParams.workflowsParameters || {},
          workflows_thread_pool_workers: wrtcParams.threadPoolWorkers || 4,
          cancel_thread_pool_tasks_on_exit: true,
          video_metadata_input_name: "video_metadata",
          workspace_name: workspace,
          workflow_id: workflowId
        };

        const roboflowRequestBody: any = {
          workflow_configuration: workflowConfig,
          api_key: env.ROBOFLOW_API_KEY,
          webrtc_realtime_processing: wrtcParams.realtimeProcessing !== false,
          webrtc_offer: {
            sdp: offer.sdp,
            type: offer.type
          },
          webrtc_config: wrtcParams.iceServers ? { iceServers: wrtcParams.iceServers } : null,
          stream_output: wrtcParams.streamOutputNames || [],
        };
        
        // Include data_output if explicitly specified
        // Ensure it's always an array when provided
        if (wrtcParams.dataOutputNames !== undefined) {
          roboflowRequestBody.data_output = Array.isArray(wrtcParams.dataOutputNames) 
            ? wrtcParams.dataOutputNames 
            : [wrtcParams.dataOutputNames];
        }
        
        // Log request for debugging (without sensitive data)
        console.log('[Proxy] WebRTC Init Request:', {
          workspace: workspace,
          workflowId: workflowId,
          hasDataOutput: !!roboflowRequestBody.data_output,
          dataOutput: roboflowRequestBody.data_output,
          streamOutput: roboflowRequestBody.stream_output
        });

        const endpoints = [
          `https://detect.roboflow.com/initialise_webrtc_worker`,
          `https://serverless.roboflow.com/initialise_webrtc_worker`,
        ];

        let lastErrorResponse: any = null;
        for (const roboflowUrl of endpoints) {
          const response = await fetch(roboflowUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roboflowRequestBody),
          });

          if (response.ok) {
            const data = await response.json();
            return new Response(JSON.stringify(data), {
              status: response.status,
              headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
              },
            });
          }
          lastErrorResponse = { status: response.status, body: await response.text() };
        }
        
        // Log error if initialization failed on all endpoints
        console.error(`WebRTC Init Failed. Last status: ${lastErrorResponse.status}, body: ${lastErrorResponse.body}`);
        
        return new Response(lastErrorResponse.body, {
          status: lastErrorResponse.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 4. Fallback to existing Inference Endpoint (Manual Mode)
    if (request.method === "POST") {
      try {
        const { image } = await request.json() as { image: string };
        if (!image) return new Response("Missing image data", { status: 400 });

        const roboflowUrl = `https://serverless.roboflow.com/${env.ROBOFLOW_WORKSPACE}/workflows/${env.ROBOFLOW_WORKFLOW_ID}`;
        const requestBody = {
          api_key: env.ROBOFLOW_API_KEY,
          inputs: {
            image: { type: "base64", value: image },
          },
        };

        const response = await fetch(roboflowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(errorText, { status: response.status, headers: { "Access-Control-Allow-Origin": "*" } });
        }

        const rawData = await response.json() as any;
        const output0 = rawData.outputs?.[0] || {};
        const predictions = output0.predictions?.predictions || output0.output?.predictions || output0.predictions || [];
        
        // Convert center coordinates to top-left bbox format [x, y, w, h]
        const minifiedPredictions = predictions.map((p: any) => ({
          bbox: [
            p.x - p.width / 2,   // top-left x
            p.y - p.height / 2,  // top-left y
            p.width,
            p.height
          ],
          label: p.class || p.label,
          score: p.confidence || p.score,
        }));

        return new Response(JSON.stringify(minifiedPredictions), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
