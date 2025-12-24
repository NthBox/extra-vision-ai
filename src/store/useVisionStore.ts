import { create } from 'zustand';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, w, h]
  label: string;
  score: number;
}

interface VisionState {
  detections: Detection[];
  isInferring: boolean;
  lastInferenceTime: number;
  imageDimensions: { width: number; height: number };
  // Real-time fields
  isRealTimeEnabled: boolean;
  isStreaming: boolean;
  streamingError: string | null;
  isPlaying: boolean;
  
  setDetections: (detections: Detection[]) => void;
  setInferring: (isInferring: boolean) => void;
  setImageDimensions: (width: number, height: number) => void;
  updateInferenceTime: () => void;
  // Real-time setters
  setRealTimeEnabled: (enabled: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingError: (error: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  detections: [],
  isInferring: false,
  lastInferenceTime: 0,
  imageDimensions: { width: 640, height: 480 },
  isRealTimeEnabled: false,
  isStreaming: false,
  streamingError: null,
  isPlaying: false,

  setDetections: (detections) => set({ detections }),
  setInferring: (isInferring) => set({ isInferring }),
  setImageDimensions: (width, height) => set({ imageDimensions: { width, height } }),
  updateInferenceTime: () => set({ lastInferenceTime: Date.now() }),
  setRealTimeEnabled: (enabled) => set({ isRealTimeEnabled: enabled }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingError: (error) => set({ streamingError: error }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}));
