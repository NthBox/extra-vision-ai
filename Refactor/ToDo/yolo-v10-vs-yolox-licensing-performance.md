# Refactor: YOLO Model Selection (YOLOv10 vs YOLOX)

## Overview
This document provides a comparative analysis of YOLOv10 and YOLOX to guide future refactoring decisions for real-time inference in the `extra-vision-ai` mobile application. It covers licensing constraints, performance benchmarks, and architectural differences.

## 1. Licensing & Commercial Use
The primary differentiator for commercial deployment is the license.

| Feature | YOLOv10 | YOLOX |
| :--- | :--- | :--- |
| **License** | **AGPL-3.0** (Strong Copyleft) | **Apache 2.0** (Permissive) |
| **Private Use** | Allowed for internal research. | Allowed. |
| **Commercial SaaS** | **Restricted**: Network interaction triggers the requirement to open-source your entire stack. | **Allowed**: No source disclosure required. |
| **App Distribution** | **Restricted**: Must provide app source code to users. | **Allowed**: Fully proprietary apps allowed. |

**Verdict**: Use **YOLOX** for closed-source commercial apps. Use **YOLOv10** only if open-sourcing the project or purchasing a commercial license.

---

## 2. Performance Comparison (Nano Models)
For mobile HUD applications, the "Nano" variants are the most relevant.

| Metric | YOLOv10n (Nano) | YOLOX-Nano |
| :--- | :--- | :--- |
| **Parameters** | ~2.3 Million | ~0.9 Million |
| **Accuracy (mAP)** | **~38.5%** (COCO) | ~25.3% (COCO) |
| **Inference** | **NMS-Free** (Lower Latency) | Requires NMS (Higher Latency) |
| **CPU Overhead** | Minimal (no post-processing) | High (NMS is CPU-bound) |

---

## 3. Key Architectural Differences

### YOLOv10 (2024)
- **NMS-Free Design**: Eliminates the Non-Maximum Suppression bottleneck using "Consistent Dual Assignment."
- **Efficiency**: Uses "Rank-Guided Block Design" to reduce redundant computations.
- **Accuracy**: Significantly higher accuracy at the same latency tier.

### YOLOX (2021)
- **Anchor-Free**: Simplifies the detection pipeline compared to previous YOLO versions.
- **Decoupled Head**: Separates classification and localization tasks for better convergence.
- **SimOTA**: Advanced label assignment strategy for improved training.

---

## 4. Apache 2.0 Alternatives to YOLOv10
If NMS-free performance is required without AGPL restrictions, consider:

1.  **RT-DETR (Apache 2.0)**:
    - Truly NMS-free.
    - Performance comparable to YOLOv10.
    - Slightly heavier than YOLOv10n for extreme edge devices.
2.  **YOLOX-PAI (Apache 2.0)**:
    - Optimized version of YOLOX by Alibaba PAI.
    - Significantly better speed/accuracy than "Stock" YOLOX.
3.  **DAMO-YOLO (Apache 2.0)**:
    - Fast on mobile/edge with a "Heavy-Neck" architecture.

---

## 5. Implementation Strategy
- **Current State**: Using Roboflow-hosted inference (WebRTC).
- **Future Local Refactor**:
    - If choosing **YOLOX-Nano**, prioritize it for its permissive license and tiny footprint.
    - If accuracy is the priority and the license is manageable, **YOLOv10n** provides the smoothest HUD experience (less jitter due to NMS-free output).
