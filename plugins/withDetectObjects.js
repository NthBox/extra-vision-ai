const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs-extra');

/**
 * Expo Config Plugin to automatically link the DetectObjects Swift/ObjC bridge files.
 */
const withDetectObjects = (config) => {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;

    const nativeFiles = ['DetectObjectsPlugin.swift', 'DetectObjectsPlugin.m'];

    nativeFiles.forEach(fileName => {
      const srcPath = path.join(projectRoot, 'src/native/ios', fileName);
      const destPath = path.join(projectRoot, 'ios', projectName, fileName);

      if (!fs.existsSync(srcPath)) {
        console.warn(`[withDetectObjects] Source file not found at ${srcPath}`);
        return;
      }

      // 1. Copy file
      fs.ensureDirSync(path.dirname(destPath));
      fs.copySync(srcPath, destPath);

      // 2. AGGRESSIVE PURGE
      const objects = xcodeProject.hash.project.objects;
      const fileRefSection = objects.PBXFileReference;
      const buildFileSection = objects.PBXBuildFile;
      
      const keysToRemove = Object.keys(fileRefSection).filter(key => {
        const ref = fileRefSection[key];
        return ref.name === fileName || ref.name === `"${fileName}"` || 
               ref.path === fileName || ref.path === `"${fileName}"` ||
               ref.path?.endsWith(`/${fileName}`);
      });

      keysToRemove.forEach(key => {
        console.log(`[withDetectObjects] Purging stale reference: ${key}`);
        
        Object.keys(buildFileSection).forEach(buildKey => {
          if (buildFileSection[buildKey].fileRef === key) {
            delete buildFileSection[buildKey];
          }
        });

        Object.keys(objects.PBXGroup).forEach(groupKey => {
          const g = objects.PBXGroup[groupKey];
          if (g.children) {
            g.children = g.children.filter(child => child.value !== key);
          }
        });

        delete fileRefSection[key];
      });

      // 3. LINK fresh
      const relativePath = path.join(projectName, fileName);
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      
      const file = xcodeProject.addFile(relativePath, mainGroupKey);
      if (file) {
        const targetUuid = xcodeProject.getFirstTarget().uuid;
        xcodeProject.addSourceFile(relativePath, { target: targetUuid }, mainGroupKey);
      }
    });

    return config;
  });
};

module.exports = withDetectObjects;
