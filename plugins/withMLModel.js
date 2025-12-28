const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo Config Plugin to automatically link .mlmodel files to the Xcode project.
 */
const withMLModel = (config, { modelPath }) => {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const xcodeProject = config.modResults;

    const absoluteModelPath = path.resolve(projectRoot, modelPath);
    const modelFileName = path.basename(modelPath);

    if (!fs.existsSync(absoluteModelPath)) {
      console.warn(`[withMLModel] Model file not found at ${absoluteModelPath}`);
      return config;
    }

    const groupName = 'Models';
    let group = xcodeProject.pbxGroupByName(groupName);
    if (!group) {
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      group = xcodeProject.addPbxGroup([], groupName, groupName);
      xcodeProject.addToPbxGroup(group.uuid, mainGroupKey);
    }

    const file = xcodeProject.addFile(absoluteModelPath, group.uuid);
    
    if (file) {
      xcodeProject.addBuildPhase([modelFileName], 'PBXResourcesBuildPhase', 'Resources', xcodeProject.getFirstTarget().uuid);
    }

    return config;
  });
};

module.exports = withMLModel;
