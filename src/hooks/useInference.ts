import { useMutation } from '@tanstack/react-query';
import { useVisionStore, Detection } from '../store/useVisionStore';

const INFERENCE_WORKER_URL = 'http://localhost:8787'; // Default for local development

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

      return response.json();
    },
    onMutate: () => {
      setInferring(true);
    },
    onSuccess: (data) => {
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

