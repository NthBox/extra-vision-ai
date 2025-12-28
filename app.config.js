import 'dotenv/config';
const withMLModel = require('./plugins/withMLModel');
const withDetectObjects = require('./plugins/withDetectObjects');

export default ({ config }) => ({
  ...config,
  name: "Extra Vision AI",
  slug: "extra-vision-ai",
  version: "1.0.2",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  plugins: [
    "@config-plugins/react-native-webrtc",
    "expo-asset",
    [
      "react-native-vision-camera",
      {
        "cameraPermissionText": "This app uses the camera for real-time vision processing.",
        "enableFrameProcessors": true
      }
    ],
    [
      withMLModel,
      {
        modelPath: "assets/models/yolov10n.mlpackage"
      }
    ],
    withDetectObjects
  ],
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.extravisionai.app",
    infoPlist: {
      "NSCameraUsageDescription": "This app uses the camera for real-time vision processing.",
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    eas: {
      projectId: "0636c85d-33a4-4d1d-863c-91351d2bdd0a"
    },
    // Dynamically set the worker URL based on the EAS build profile
    inferenceWorkerUrl: process.env.APP_ENV === 'production'
      ? "https://extra-vision-inference-production.atruenetwork.workers.dev"
      : "https://extra-vision-inference-staging.atruenetwork.workers.dev"
  },
  owner: "atruenetwork"
});

