import { create } from 'zustand';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, w, h]
  label: string;
  score: number;
}

export interface CameraConfig {
  fov: number;          // Horizontal FOV in degrees
  height: number;       // Camera mounting height in meters
  pitch: number;        // Camera tilt in radians (negative = looking down)
  opticalCenter: [number, number]; // [cx, cy] normalized (0.5, 0.5 default)
  horizontalOffset: number; // Nudge objects left/right (-0.5 to 0.5, default 0)
}

export type CameraPreset = 'WIDE' | 'ULTRA_WIDE' | 'TELE';

const CAMERA_PRESETS: Record<CameraPreset, CameraConfig> = {
  WIDE: {
    fov: 60,
    height: 1.2,
    pitch: -0.05, // ~3 degrees down
    opticalCenter: [0.5, 0.5],
    horizontalOffset: 0,
  },
  ULTRA_WIDE: {
    fov: 120,
    height: 1.2,
    pitch: -0.05,
    opticalCenter: [0.5, 0.5],
    horizontalOffset: 0,
  },
  TELE: {
    fov: 30,
    height: 1.2,
    pitch: -0.02,
    opticalCenter: [0.5, 0.5],
    horizontalOffset: 0,
  }
};

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
  visualizationMode: 'CAMERA' | '3D';
  threeViewMode: 'REAL' | 'SIMULATED';
  simulatedViewZoom: 'NORMAL' | 'ZOOMED';
  
  // Camera Model fields
  cameraConfig: CameraConfig;
  
  setDetections: (detections: Detection[]) => void;
  setInferring: (isInferring: boolean) => void;
  setImageDimensions: (width: number, height: number) => void;
  updateInferenceTime: () => void;
  // Real-time setters
  setRealTimeEnabled: (enabled: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingError: (error: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVisualizationMode: (mode: 'CAMERA' | '3D') => void;
  setThreeViewMode: (mode: 'REAL' | 'SIMULATED') => void;
  setSimulatedViewZoom: (zoom: 'NORMAL' | 'ZOOMED') => void;
  
  // Camera Model setters
  updateCameraConfig: (config: Partial<CameraConfig>) => void;
  setCameraPreset: (preset: CameraPreset) => void;
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
  visualizationMode: 'CAMERA',
  threeViewMode: 'SIMULATED',
  simulatedViewZoom: 'NORMAL',
  cameraConfig: CAMERA_PRESETS.WIDE,

  setDetections: (detections) => set({ detections }),
  setInferring: (isInferring) => set({ isInferring }),
  setImageDimensions: (width, height) => set({ imageDimensions: { width, height } }),
  updateInferenceTime: () => set({ lastInferenceTime: Date.now() }),
  setRealTimeEnabled: (enabled) => set({ isRealTimeEnabled: enabled }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingError: (error) => set({ streamingError: error }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
  setThreeViewMode: (threeViewMode) => set({ threeViewMode }),
  setSimulatedViewZoom: (simulatedViewZoom) => set({ simulatedViewZoom }),
  
  updateCameraConfig: (config) => set((state) => ({ 
    cameraConfig: { ...state.cameraConfig, ...config } 
  })),
  setCameraPreset: (preset) => set({ cameraConfig: CAMERA_PRESETS[preset] }),
}));
