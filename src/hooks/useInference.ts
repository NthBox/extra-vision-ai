import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useVisionStore, Detection } from '../store/useVisionStore';

const INFERENCE_WORKER_URL = 
  Constants.expoConfig?.extra?.inferenceWorkerUrl || 'http://localhost:8787';

export const useInference = () => {
  const { setDetections, setInferring, updateInferenceTime } = useVisionStore();

  return useMutation({
    mutationFn: async (base64Image: string): Promise<Detection[]> => {
      const response = await fetch(INFERENCE_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        throw new Error('Inference failed');
      }

      const data = await response.json();
      
      // Map predictions to standard top-left format [x, y, w, h]
      // Workers often return Roboflow standard format {x, y, width, height} as centers
      if (Array.isArray(data)) {
        return data.map((p: any) => {
          // If bbox is already present, use it, otherwise calculate it
          if (p.bbox && Array.isArray(p.bbox)) return p;
          
          const centerX = p.x || 0;
          const centerY = p.y || 0;
          const width = p.width || 0;
          const height = p.height || 0;
          
          return {
            bbox: [
              centerX - width / 2,
              centerY - height / 2,
              width,
              height
            ],
            label: p.class || p.label || 'unknown',
            score: p.confidence || p.score || 0
          };
        });
      }
      
      return [];
    },
    onMutate: () => {
      setInferring(true);
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        console.log(`Detections: ${data.map(d => d.label).join(', ')}`);
      }
      setDetections(data);
      updateInferenceTime();
    },
    onError: (error) => {
      console.error('Inference error:', error);
    },
    onSettled: () => {
      setInferring(false);
    },
  });
};

