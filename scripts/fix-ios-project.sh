#!/bin/bash
# Manually fix the Xcode project file to remove stale model references and fix relative paths.

PROJECT_FILE="ios/ExtraVisionAI.xcodeproj/project.pbxproj"

if [ ! -f "$PROJECT_FILE" ]; then
  echo "Project file not found at $PROJECT_FILE"
  exit 1
fi

echo "Cleaning up Xcode project file..."

# 1. Remove any line containing the model name
sed -i '' '/yolov10n.mlpackage/d' "$PROJECT_FILE"
sed -i '' '/YOLOv10_Internal_Model/d' "$PROJECT_FILE"
sed -i '' '/Internal_YOLO_Model/d' "$PROJECT_FILE"

# 2. Re-insert the CORRECT reference into the PBXFileReference section
sed -i '' '/\/\* Begin PBXFileReference section \*\//a \t\tEVAI_YOLO_MODEL /* yolov10n.mlpackage */ = {isa = PBXFileReference; lastKnownFileType = wrapper.mlpackage; name = yolov10n.mlpackage; path = ExtraVisionAI/yolov10n.mlpackage; sourceTree = "<group>"; };
' "$PROJECT_FILE"

# 3. Re-insert the Build File reference
sed -i '' '/\/\* Begin PBXBuildFile section \*\//a \t\tEVAI_YOLO_BUILD /* yolov10n.mlpackage in Resources */ = {isa = PBXBuildFile; fileRef = EVAI_YOLO_MODEL /* yolov10n.mlpackage */; };
' "$PROJECT_FILE"

# 4. Add to Models group children
sed -i '' '/\/\* Models \*\//,/};/ { /children = (/a \t\t\t\tEVAI_YOLO_MODEL /* yolov10n.mlpackage */,
}' "$PROJECT_FILE"

# 5. Add to Resources Build Phase
sed -i '' '/\/\* Resources \*\//,/};/ { /files = (/a \t\t\t\tEVAI_YOLO_BUILD /* yolov10n.mlpackage in Resources */,
}' "$PROJECT_FILE"

echo "Project file fixed successfully."
