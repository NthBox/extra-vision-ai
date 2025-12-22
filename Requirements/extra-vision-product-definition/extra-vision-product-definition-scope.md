# Extra Vision AI - Product Scope & Technical Documentation

## 1. Project Overview
Extra Vision AI is a high-performance, real-time computer vision system designed for edge devices, specifically targeting automotive POV (Point of View) driver assistance. The system leverages Meta's **SAM3 (Segment Anything Model 3)** foundation model, distilled into lightweight architectures like **YOLOv11** or **EfficientViT**, to provide real-time object detection and tracking with a HUD (Heads-Up Display) overlay on iPhone 15 devices using Expo.

### 1.1 Core Objectives
*   **Real-time POV Detection:** Identify cars, pedestrians, cyclists, and obstacles in a driver's field of view.
*   **Edge Optimization:** Achieve low-latency inference on mobile hardware.
*   **Automated Pipeline:** Utilize SAM3 for zero-shot auto-annotation to train custom lightweight models in seconds rather than days.
*   **Cost-Efficient Scaling:** Balance between cloud-based serverless inference and local on-device execution.

---

## 2. Technology Stack & Frameworks
*   **Vision Foundation:** Meta SAM3 (November 2025 Release).
*   **Detection Architectures:** YOLOv8, YOLOv11 (Ultralytics).
*   **Optimization Engine:** Unsloth (for QLoRA, Quantization-Aware Training).
*   **Platform & Deployment:** Roboflow Rapid / Workflows.
*   **Mobile Framework:** React Native / Expo (targeting iPhone 15 Pro).
*   **On-Device Runtime:** ExecuTorch (for local model execution).

---

## 3. SAM3 Distillation Process
SAM3 is powerful but computationally expensive (~100 objects in 30ms on high-end GPUs). For edge deployment, we use **Progressive Hierarchical Distillation (PHD)**.

### 3.1 PHD Phases
1.  **Encoder Distillation:**
    *   **Objective:** Align the student model's image features with SAM3's high-dimensional embeddings.
    *   **Method:** "Prompt-in-the-loop" training on datasets like SA-1B.
2.  **Temporal Memory Distillation:**
    *   **Objective:** Replace SAM3's dense memory with a compact Perceiver-based module.
    *   **Method:** Training on SA-V dataset to retrieve spatiotemporal features efficiently for video tracking.
3.  **End-to-End Fine-Tuning:**
    *   **Objective:** Preserve text-prompted segmentation accuracy.
    *   **Method:** Fine-tuning on Promptable Concept Segmentation (PCS) data.

### 3.2 Distillation to YOLO
We utilize SAM3 as a "Teacher" to auto-annotate raw video footage.
*   **Step 1:** Upload POV footage to Roboflow.
*   **Step 2:** Use SAM3 text prompts (e.g., "brake lights", "pothole") to generate masks.
*   **Step 3:** Convert masks to bounding boxes/polygons for YOLOv11 training.
*   **Step 4:** Deploy the lightweight YOLO model to the edge.

---

## 4. Efficient Training with Unsloth
Unsloth provides the critical infrastructure for fine-tuning vision-language capabilities into smaller models.
*   **QLoRA (4-bit):** Reduces VRAM usage by 70-80% during the distillation phase.
*   **Quantization-Aware Training (QAT):** Uses the `phone-deployment` scheme (int8/int4) to simulate on-device precision loss during training, ensuring accuracy remains high after conversion.
*   **ExecuTorch Integration:** Seamlessly export distilled models for iPhone 15 Pro deployment.

### 4.1 Example Unsloth Distillation Workflow
```python
from unsloth import FastLanguageModel
from torch.utils.data import DataLoader

# 1. Initialize Teacher (SAM3) and Student (EfficientViT)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="meta/sam3",
    max_seq_length=1024,
    qat_scheme="phone-deployment" # Prepares for iPhone 15
)

# 2. Apply Distillation Loss
# The student learns to mimic SAM3's segmentation masks and temporal tracking
trainer = DistillationTrainer(
    teacher_model=sam3_model,
    student_model=efficientvit_student,
    train_dataset=annotated_dataset,
    args=training_args
)
trainer.train()

# 3. Export for Mobile
model.save_pretrained_executorch("extra_vision_model.pt")
```

---

## 5. Implementation Specifications

### 5.1 Mobile Performance Targets (iPhone 15 Pro)
| Parameter | Target Specification |
| :--- | :--- |
| **Input Resolution** | 480p (640x480) |
| **Frame Rate** | 15 FPS |
| **Latency** | < 100ms (End-to-end) |
| **Connectivity** | Hybrid (Local inference primary, Cloud fallback) |

### 5.2 HUD Overlay Requirements
*   **Bounding Boxes:** Real-time highlighting of detected objects.
*   **Distance Estimation:** Real-time motion estimation derived from SAM3 tracking logic.
*   **Alerts:** Visual/Auditory cues for "Collision Risk" or "Pedestrian Ahead".

---

## 6. Infrastructure & Cost Analysis
### 6.1 Roboflow Workflows (Serverless)
*   **Cheapest Option:** Serverless Video Streams (Cloud) for rapid prototyping.
*   **Workflow ID:** `find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats`
*   **API Strategy:** Use base64 encoding for local frames or URL-based processing for remote streams.

### 6.2 Node.js Integration Example (Expo/Server-side Proxy)
```javascript
const ROBOFLOW_CONFIG = {
    apiUrl: "https://serverless.roboflow.com",
    apiKey: "0Sh2tSQ9KHzMW6swJE8J",
    workspace: "purple",
    workflowId: "find-people-cars-dogs-animals..."
};

async function analyzeFrame(base64Image) {
    const response = await fetch(
        `${ROBOFLOW_CONFIG.apiUrl}/${ROBOFLOW_CONFIG.workspace}/workflows/${ROBOFLOW_CONFIG.workflowId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: ROBOFLOW_CONFIG.apiKey,
                inputs: { image: { type: "base64", value: base64Image } }
            })
        }
    );
    return await response.json();
}
```

### 6.3 Expected API Response Structure
```json
{
    "outputs": [
        {
            "predictions": {
                "image": { "width": 640, "height": 480 },
                "predictions": [
                    {
                        "x": 412.2,
                        "y": 357.7,
                        "width": 94.5,
                        "height": 46.7,
                        "confidence": 0.89,
                        "class": "car",
                        "detection_id": "uuid-..."
                    }
                ]
            },
            "visualization": {
                "type": "base64",
                "value": "..." 
            }
        }
    ]
}
```

### 6.4 Local vs. Cloud
*   **Cloud:** Easier implementation, pay-per-minute, requires stable 5G.
*   **Local (ExecuTorch):** Zero recurring inference cost, maximum privacy, but requires complex model optimization (via Unsloth/QAT).

---

## 7. Technical References
*   **SAM3 Predictor (Ultralytics):**
    ```python
    from ultralytics.models.sam import SAM3VideoSemanticPredictor
    predictor = SAM3VideoSemanticPredictor(model="sam3.pt")
    results = predictor(source="video.mp4", text=["car", "pedestrian"], stream=True)
    ```
*   **Training Template:** [yolo-training-template](https://github.com/mfranzon/yolo-training-template)

---

## 8. Challenges & Considerations
*   **Vocabulary Scope:** SAM3 handles atomic concepts well; complex reasoning (e.g., "is the driver distracted?") may require a secondary MLLM (Multimodal LLM) like Llama 3.2 Vision.
*   **Rare Concepts:** Performance on niche objects (e.g., specific road signs) requires targeted fine-tuning.
*   **Thermal Throttling:** Continuous 15 FPS inference on iPhone 15 may lead to heat buildup; selective frame processing (every 2nd or 3rd frame) is recommended.

---

## 9. Development Roadmap
1.  **Phase 1:** Set up Roboflow Workflow for auto-annotation using SAM3.
2.  **Phase 2:** Distill SAM3 into YOLOv11n using Unsloth QAT.
3.  **Phase 3:** Integrate Expo-based frontend with HUD overlay.
4.  **Phase 4:** Optimize for on-device execution using ExecuTorch.

