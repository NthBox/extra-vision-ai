export interface Env {
  ROBOFLOW_API_KEY: string;
  ROBOFLOW_WORKSPACE: string;
  ROBOFLOW_WORKFLOW_ID: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
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
    if (pathname === "/v1/webrtc-turn-config/twilio") {
      try {
        const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Tokens.json`;
        
        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Twilio API error: ${response.status} ${errorText}`);
        }

        const data = await response.json() as any;
        
        // Transform Twilio's ice_servers to standard WebRTC iceServers
        // Twilio returns: { ice_servers: [{ urls, username, credential }, ...] }
        const iceServers = data.ice_servers || [];
        
        return new Response(JSON.stringify({ iceServers }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      } catch (error: any) {
        console.error('[Proxy] Twilio TURN error:', error.message);
        return new Response(JSON.stringify({ 
          error: "Failed to fetch Twilio TURN config",
          details: error.message,
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: ["stun:stun1.l.google.com:19302"] }
          ]
        }), {
          status: 200, // Return 200 with fallback STUN to keep frontend working
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      }
    }

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
          { urls: ["stun:stun1.l.google.com:19302"] },
          { urls: ["stun:stun2.l.google.com:19302"] },
          { urls: ["stun:stun.cloudflare.com:3478"] }
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
          `https://infer.roboflow.com/initialise_webrtc_worker`,
          `https://detect.roboflow.com/initialise_webrtc_worker`,
          `https://serverless.roboflow.com/initialise_webrtc_worker`,
        ];

        let lastErrorResponse: any = { status: 504, body: "All Roboflow endpoints timed out or failed" };
        for (const roboflowUrl of endpoints) {
          try {
            console.log(`[Proxy] Trying ${roboflowUrl}...`);
            const startTime = Date.now();
            
            // Increase timeout to 30s for heavy models like SAM 3 to allow for cold starts
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(roboflowUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(roboflowRequestBody),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const elapsed = Date.now() - startTime;
            console.log(`[Proxy] ${roboflowUrl} responded in ${elapsed}ms with status ${response.status}`);

            if (response.ok) {
              const data = await response.json();
              console.log(`[Proxy] Success! WebRTC session initialized.`);
              return new Response(JSON.stringify(data), {
                status: response.status,
                headers: { 
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*" 
                },
              });
            }
            lastErrorResponse = { status: response.status, body: await response.text() };
            console.log(`[Proxy] ${roboflowUrl} failed with status ${response.status}: ${lastErrorResponse.body}`);
          } catch (error: any) {
            const elapsed = Date.now() - startTime;
            console.log(`[Proxy] ${roboflowUrl} failed after ${elapsed}ms: ${error.message}`);
            // If it's a timeout and we don't have a real response yet, update the lastError
            if (error.name === 'AbortError' && lastErrorResponse.status === 504) {
              lastErrorResponse = { status: 504, body: `Timeout calling ${roboflowUrl} after 30s` };
            }
            continue;
          }
        }
        
        // Log error if initialization failed on all endpoints
        console.error(`WebRTC Init Failed. Last status: ${lastErrorResponse.status}, body: ${lastErrorResponse.body}`);
        
        return new Response(JSON.stringify({ 
          error: "Inference initialization failed", 
          details: lastErrorResponse.body,
          status: lastErrorResponse.status 
        }), {
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
        const { image, requestedOutput, workflowId: customWorkflowId } = await request.json() as { 
          image: string, 
          requestedOutput?: string,
          workflowId?: string 
        };
        if (!image) return new Response("Missing image data", { status: 400 });

        const workflowId = customWorkflowId || env.ROBOFLOW_WORKFLOW_ID;
        const roboflowUrl = `https://serverless.roboflow.com/${env.ROBOFLOW_WORKSPACE}/workflows/${workflowId}`;
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
        const outputs = rawData.outputs?.[0] || rawData.outputs || {};
        
        // If a specific output was requested, try that first
        let predictions: any[] = [];
        if (requestedOutput && outputs[requestedOutput]) {
          predictions = outputs[requestedOutput].predictions || outputs[requestedOutput];
        } else {
          // Fallback to the existing multi-key logic
          predictions = outputs.model_predictions?.predictions || 
                        outputs.predictions?.predictions || 
                        outputs.output?.predictions || 
                        outputs.predictions || 
                        outputs.model_predictions || 
                        [];
        }
        
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
