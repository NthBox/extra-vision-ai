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
    
    // Robustly find the project name/target name
    const projectName = config.modRequest.projectName || config.name || 'ExtraVisionAI';

    const absoluteSrcPath = path.resolve(projectRoot, modelPath);
    const modelFileName = path.basename(modelPath);
    
    // Physical destination: ios/<ProjectName>/<ModelFile>
    const destPath = path.join(projectRoot, 'ios', projectName, modelFileName);

    if (!fs.existsSync(absoluteSrcPath)) {
      console.warn(`[withMLModel] Source model not found at ${absoluteSrcPath}`);
      return config;
    }

    // 1. Copy the model to the native project folder
    fs.ensureDirSync(path.dirname(destPath));
    if (fs.existsSync(destPath)) fs.removeSync(destPath);
    fs.copySync(absoluteSrcPath, destPath);

    // 2. Setup Group (Purely logical)
    const groupName = 'Models';
    let group = xcodeProject.pbxGroupByName(groupName);
    if (!group) {
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      group = xcodeProject.addPbxGroup([], groupName, null);
      xcodeProject.addToPbxGroup(group.uuid, mainGroupKey);
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

    // 4. ADD FRESH
    const frUUID = 'EVAI_MODEL_REF_UUID';
    const bfUUID = 'EVAI_MODEL_BUILD_UUID';
    
    // In PBXFileReference, 'path' should be relative to the source tree.
    // If sourceTree is "<group>", and the group is the main group (root of the project),
    // then path should be "ProjectName/ModelName"
    objects.PBXFileReference[frUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.mlpackage',
      name: modelFileName,
      path: `"${projectName}/${modelFileName}"`,
      sourceTree: '"<group>"'
    };

    objects.PBXBuildFile[bfUUID] = {
      isa: 'PBXBuildFile',
      fileRef: frUUID,
      fileRef_comment: modelFileName
    };

    // Link to group
    if (group.children) {
      group.children = group.children.filter(c => c.comment !== modelFileName);
      group.children.push({ value: frUUID, comment: modelFileName });
    }

    // Link to Resources phase of the MAIN target
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
