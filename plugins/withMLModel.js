const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo Config Plugin to automatically link .mlmodel or .mlpackage files to the Xcode project.
 */
const withMLModel = (config, { modelPath }) => {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const xcodeProject = config.modResults;

    const absoluteModelPath = path.resolve(projectRoot, modelPath);
    const modelFileName = path.basename(modelPath);
    const isPackage = modelFileName.endsWith('.mlpackage');

    if (!fs.existsSync(absoluteModelPath)) {
      console.warn(`[withMLModel] Model not found at ${absoluteModelPath}`);
      return config;
    }

    const groupName = 'Models';
    let group = xcodeProject.pbxGroupByName(groupName);
    if (!group) {
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      group = xcodeProject.addPbxGroup([], groupName, groupName);
      xcodeProject.addToPbxGroup(group.uuid, mainGroupKey);
    }

    // Add the file/folder to the project
    // For .mlpackage, we should specify the file type so Xcode knows it's a bundle
    const fileOptions = isPackage ? { lastKnownFileType: 'wrapper.mlpackage' } : {};
    const file = xcodeProject.addFile(absoluteModelPath, group.uuid, fileOptions);
    
    if (file) {
      // Add to the 'Resources' build phase so it's bundled/compiled
      xcodeProject.addBuildPhase([modelFileName], 'PBXResourcesBuildPhase', 'Resources', xcodeProject.getFirstTarget().uuid);
    }

    return config;
  });
};

module.exports = withMLModel;
