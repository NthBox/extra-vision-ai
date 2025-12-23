export interface Env {
  ROBOFLOW_API_KEY: string;
  ROBOFLOW_WORKSPACE: string;
  ROBOFLOW_WORKFLOW_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { image } = await request.json() as { image: string };

      if (!image) {
        return new Response("Missing image data", { status: 400 });
      }

      const roboflowUrl = `https://serverless.roboflow.com/${env.ROBOFLOW_WORKSPACE}/workflows/${env.ROBOFLOW_WORKFLOW_ID}`;

      const response = await fetch(roboflowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: env.ROBOFLOW_API_KEY,
          inputs: {
            image: {
              type: "base64",
              value: image,
            },
          },
        }),
      });

      const rawData = await response.json() as any;

      // Transform raw Roboflow response into minified version for mobile
      // Based on typical Roboflow Workflow output structure
      const predictions = rawData.outputs?.[0]?.predictions?.predictions || [];
      
      const minifiedPredictions = predictions.map((p: any) => ({
        bbox: [p.x, p.y, p.width, p.height],
        label: p.class,
        score: p.confidence,
      }));

      return new Response(JSON.stringify(minifiedPredictions), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

