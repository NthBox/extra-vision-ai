export interface Env {
  ROBOFLOW_API_KEY: string;
  ROBOFLOW_WORKSPACE: string;
  ROBOFLOW_WORKFLOW_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    console.log(`[DEBUG] Request: ${request.method} ${pathname}`);
    console.log(`[DEBUG] Full URL: ${request.url}`);

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

    // 2. NEW: Streaming Session Initialization
    if (pathname === "/v1/stream/init" || pathname.startsWith("/v1/stream/init")) {
      console.log(`[DEBUG] Matched /v1/stream/init route`);
      console.log(`[DEBUG] Method: ${request.method}, Pathname: ${pathname}`);
      
      // Immediate test response to verify routing works
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required", method: request.method }), {
          status: 405,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      try {
        console.log("Initializing Streaming Session...");
        console.log("Workspace:", env.ROBOFLOW_WORKSPACE);
        console.log("Workflow ID:", env.ROBOFLOW_WORKFLOW_ID);
        console.log("API Key Length:", env.ROBOFLOW_API_KEY?.length || 0);
        console.log("API Key First 5 chars:", env.ROBOFLOW_API_KEY?.substring(0, 5) || "NONE");
        
        // Try multiple possible endpoints
        const endpoints = [
          `https://serverless.roboflow.com/webrtc/stream/init`,
          `https://detect.roboflow.com/webrtc/stream/init`,
          `https://serverless.roboflow.com/stream/workflows/${env.ROBOFLOW_WORKSPACE}/${env.ROBOFLOW_WORKFLOW_ID}`,
        ];

        let lastError: any = null;
        for (const streamUrl of endpoints) {
          try {
            console.log(`Trying endpoint: ${streamUrl}`);
            const requestBody = {
              api_key: env.ROBOFLOW_API_KEY,
              workflow_id: env.ROBOFLOW_WORKFLOW_ID,
              workspace_id: env.ROBOFLOW_WORKSPACE,
              config: {
                requested_plan: "webrtc-gpu-large",
                requested_region: "us",
                realtime_processing: true
              }
            };
            
            const response = await fetch(streamUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });

            const data = await response.json() as any;
            console.log(`Response from ${streamUrl}:`, JSON.stringify(data));
            
            if (response.ok) {
              return new Response(JSON.stringify(data), {
                status: response.status,
                headers: { 
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*" 
                },
              });
            }
            
            lastError = data;
          } catch (err: any) {
            console.log(`Endpoint ${streamUrl} failed:`, err.message);
            lastError = err;
          }
        }

        // If all endpoints failed, return the last error
        return new Response(JSON.stringify(lastError || { error: "All endpoints failed" }), {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 3. Fallback to existing Inference Endpoint
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { image } = await request.json() as { image: string };

      if (!image) {
        return new Response("Missing image data", { status: 400 });
      }

      // Use serverless workflows endpoint (Rapid endpoint is web UI, not API)
      const roboflowUrl = `https://serverless.roboflow.com/${env.ROBOFLOW_WORKSPACE}/workflows/${env.ROBOFLOW_WORKFLOW_ID}`;
      
      console.log(`[DEBUG] Calling Roboflow: ${roboflowUrl}`);
      console.log(`[DEBUG] API Key present: ${!!env.ROBOFLOW_API_KEY}`);
      console.log(`[DEBUG] Image data length: ${image?.length || 0}`);
      console.log(`[DEBUG] Workspace: ${env.ROBOFLOW_WORKSPACE}`);
      console.log(`[DEBUG] Workflow ID: ${env.ROBOFLOW_WORKFLOW_ID}`);

      const requestBody = {
        api_key: env.ROBOFLOW_API_KEY,
        inputs: {
          image: {
            type: "base64",
            value: image,
          },
        },
      };

      console.log(`[DEBUG] Request body keys: ${Object.keys(requestBody).join(', ')}`);
      console.log(`[DEBUG] Request body structure:`, JSON.stringify({
        api_key: "***",
        inputs: requestBody.inputs
      }));

      const response = await fetch(roboflowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));

      if (!response.ok) {
        const responseText = await response.text();
        console.error(`[DEBUG] Roboflow Error (${response.status}):`, responseText.substring(0, 500));
        
        let errorData: any;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText.substring(0, 200), raw: responseText.substring(0, 500) };
        }
        
        return new Response(JSON.stringify(errorData), { 
          status: response.status,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });
      }

      // Parse JSON response
      const rawData = await response.json() as any;
      console.log(`[DEBUG] Successfully parsed JSON response`);
      
      // DEBUG: Log the keys of the response to verify structure
      console.log("Roboflow Raw Output Keys:", JSON.stringify(Object.keys(rawData)));
      if (rawData.outputs?.[0]) {
        console.log("First Output Object Keys:", JSON.stringify(Object.keys(rawData.outputs[0])));
      }

      // Extract predictions - Roboflow Workflows usually nest them under the step name
      // We try a few common paths based on the 'Find People...' workflow
      const output0 = rawData.outputs?.[0] || {};
      const predictions = 
        output0.predictions?.predictions || // Standard Workflow
        output0.output?.predictions ||      // Alternative Workflow
        output0.predictions ||               // Simple Detection
        [];
      
      const minifiedPredictions = predictions.map((p: any) => ({
        bbox: [p.x, p.y, p.width, p.height],
        label: p.class || p.label,
        score: p.confidence || p.score,
      }));

      console.log(`Inference successful: Found ${minifiedPredictions.length} objects.`);

      return new Response(JSON.stringify(minifiedPredictions), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error: any) {
      console.error("Worker Internal Error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};

