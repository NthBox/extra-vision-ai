const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo Config Plugin to automatically link the DetectObjects Swift/ObjC bridge files.
 * This version is EAS-Ready: it copies files from src/native/ios to the generated ios folder.
 */
const withDetectObjects = (config) => {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;

    const nativeFiles = [
      'DetectObjectsPlugin.swift',
      'DetectObjectsPlugin.m'
    ];

    nativeFiles.forEach(fileName => {
      // 1. SOURCE: Tracked in Git
      const srcPath = path.join(projectRoot, 'src/native/ios', fileName);
      // 2. DESTINATION: Generated ios folder
      const destPath = path.join(projectRoot, 'ios', projectName, fileName);

      if (!fs.existsSync(srcPath)) {
        console.warn(`[withDetectObjects] Source file not found at ${srcPath}`);
        return;
      }

      // Ensure the destination directory exists (ios/ExtraVisionAI/)
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy the file into the native project directory
      fs.copyFileSync(srcPath, destPath);

      // 3. LINK: Add the reference to Xcode project
      const filePath = path.join(projectName, fileName);
      const file = xcodeProject.addFile(filePath, xcodeProject.getFirstProject().firstProject.mainGroup);
      
      if (file) {
        const targetUuid = xcodeProject.getFirstTarget().uuid;
        xcodeProject.addSourceFile(filePath, { target: targetUuid }, xcodeProject.getFirstProject().firstProject.mainGroup);
      }
    });

    return config;
  });
};

module.exports = withDetectObjects;
