const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs-extra');

/**
 * Expo Config Plugin to automatically link .mlmodel or .mlpackage files to the Xcode project.
 */
const withMLModel = (config, { modelPath }) => {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const xcodeProject = config.modResults;
    
    // Explicitly use ExtraVisionAI as it's the known project folder name
    const projectName = 'ExtraVisionAI';

    const absoluteSrcPath = path.resolve(projectRoot, modelPath);
    const modelFileName = path.basename(modelPath);
    
    const destPath = path.join(projectRoot, 'ios', projectName, modelFileName);

    if (!fs.existsSync(absoluteSrcPath)) {
      console.warn(`[withMLModel] Source model not found at ${absoluteSrcPath}`);
      return config;
    }

    // 1. Copy the model
    fs.ensureDirSync(path.dirname(destPath));
    if (fs.existsSync(destPath)) fs.removeSync(destPath);
    fs.copySync(absoluteSrcPath, destPath);

    // 2. Setup Group
    const groupName = 'Models';
    let groupKey = xcodeProject.findPBXGroupKey({ name: groupName });
    if (!groupKey) {
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      const group = xcodeProject.addPbxGroup([], groupName, projectName); 
      groupKey = group.uuid;
      xcodeProject.addToPbxGroup(groupKey, mainGroupKey);
    }

    // 3. PURGE ALL TRACES
    const objects = xcodeProject.hash.project.objects;
    Object.keys(objects.PBXFileReference).forEach(key => {
      const fr = objects.PBXFileReference[key];
      if (fr.path?.includes(modelFileName) || fr.name?.includes(modelFileName) || fr.path?.includes('InferenceModel')) {
        delete objects.PBXFileReference[key];
      }
    });
    Object.keys(objects.PBXBuildFile).forEach(key => {
      const bf = objects.PBXBuildFile[key];
      if (bf.fileRef_comment?.includes(modelFileName) || bf.fileRef_comment?.includes('InferenceModel')) {
        delete objects.PBXBuildFile[key];
      }
    });

    // 4. ADD FRESH DETERMINISTIC
    const frUUID = 'EVAI_MODEL_REF_UUID_0001';
    const bfUUID = 'EVAI_MODEL_BLD_UUID_0001';
    
    objects.PBXFileReference[frUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.mlpackage',
      name: modelFileName,
      path: modelFileName,
      sourceTree: '"<group>"'
    };

    objects.PBXBuildFile[bfUUID] = {
      isa: 'PBXBuildFile',
      fileRef: frUUID,
      fileRef_comment: modelFileName
    };

    // Manual link to group
    const groupObj = objects.PBXGroup[groupKey];
    if (groupObj && groupObj.children) {
      groupObj.children = groupObj.children.filter(c => c.comment !== modelFileName);
      groupObj.children.push({ value: frUUID, comment: modelFileName });
    }

    // Manual link to Resources phase
    const targetUuid = xcodeProject.getFirstTarget().uuid;
    const resourcesPhase = xcodeProject.pbxResourcesBuildPhaseObj(targetUuid);
    if (resourcesPhase && resourcesPhase.files) {
      resourcesPhase.files = resourcesPhase.files.filter(f => f.comment !== `${modelFileName} in Resources`);
      resourcesPhase.files.push({ value: bfUUID, comment: `${modelFileName} in Resources` });
    }

    return config;
  });
};

module.exports = withMLModel;
