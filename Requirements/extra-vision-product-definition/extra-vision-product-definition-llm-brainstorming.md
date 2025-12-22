```
sam3 distillation;
https://x.com/i/grok/share/pO9pqw5Obu8Ed83wALH4fOY5F
AM3, Meta's November 2025 release, excels at text-prompted video segmentation and tracking, slashing custom detector training from days to seconds, as demoed in the quoted post with real-time object motion estimation.
Despite SAM3's power, its large size and slow inference limit edge device use; the post emphasizes distilling it into compact models via Roboflow Rapid for fast, low-compute deployments.
The video illustrates Rapid's pipeline—uploading basketball footage, SAM3 auto-annotating "player" or "door" across frames, distilling to a lightweight model, and deploying locally—enabling sub-minute vision app builds.

Explain SAM3 distillation process

YOLO models for edge devices

Explain SAM3 distillation process

SAM3 distillation, as referenced in the X post, involves transforming the large, computationally intensive Segment Anything Model 3 (SAM3) into smaller, more efficient models suitable for edge devices and real-time applications. Here's a breakdown of the process based on the context and related web results:Overview of SAM3SAM3, released by Meta in November 2025, is a advanced vision foundation model that excels in detecting, segmenting, and tracking objects in images and videos using text prompts. It processes over 100 objects in 30 milliseconds on high-end GPUs and leads benchmarks for real-world tasks like video tracking. However, its size and computational demands make it less suitable for low-compute edge devices.Distillation ProcessThe distillation process aims to transfer SAM3's capabilities into lighter models without significant loss in performance. This is achieved through a method called Progressive Hierarchical Distillation (PHD), as detailed in the arXiv paper "EfficientSAM3: Progressive Hierarchical Distillation for Video Concept Segmentation from SAM1, 2, and 3."Steps in PHD:Encoder Distillation:Objective: Align the image features of the student model with those of SAM3.
Method: This is done via "prompt-in-the-loop" training on the SA-1B dataset. The student model learns to mimic SAM3's feature extraction capabilities by being guided by prompts during training.
Outcome: The student model gains a similar understanding of visual concepts as SAM3 but with a reduced parameter count.

Temporal Memory Distillation:Objective: Replace SAM3's dense memory module with a compact, efficient alternative.
Method: A Perceiver-based module is trained on the SA-V dataset to compress and retrieve spatiotemporal features. This module is designed to handle video data efficiently, maintaining the ability to track objects across frames.
Outcome: The student model can now process video sequences with reduced memory usage, making it suitable for devices with limited resources.

End-to-End Fine-Tuning:Objective: Refine the entire pipeline to preserve concept-level performance.
Method: The student model undergoes fine-tuning on the official SAM3 Promptable Concept Segmentation (PCS) data. This step ensures that the distilled model retains SAM3's accuracy in segmenting and tracking objects based on text prompts.
Outcome: The final model maintains high fidelity to SAM3's behavior while being significantly smaller and faster.

Implementation with Roboflow RapidThe X post highlights how Roboflow Rapid facilitates this distillation process:Upload and Annotate: Users upload videos or images, and SAM3 auto-annotates objects based on text prompts (e.g., "player," "door").
Distillation: The annotated data is used to train a smaller model, often using architectures like YOLOv8 or other efficient models.
Deployment: The distilled model is deployed locally or via a custom endpoint, enabling rapid prototyping and deployment without extensive labeling or training time.

Technical DetailsModel Architectures: The student models use backbones like RepViT, TinyViT, and EfficientViT, which are designed for efficiency.
Performance Trade-offs: The distilled models achieve strong performance-efficiency trade-offs, as benchmarked on popular Video Object Segmentation (VOS) datasets.
Computational Requirements: Unlike SAM3, which requires high-end GPUs, the distilled models are optimized for edge devices, reducing latency and resource consumption.

Example Code Snippet (from Ultralytics Docs)Here's a conceptual example of how SAM3 might be used in a distillation pipeline, though the exact implementation details would vary:python

from ultralytics.models.sam import SAM3VideoSemanticPredictor

# Initialize semantic video predictor with overrides
overrides = dict(
    conf=0.25,
    task="segment",
    mode="predict",
    imgsz=640,
    model="sam3.pt",
    half=True,
    save=True
)
predictor = SAM3VideoSemanticPredictor(overrides=overrides)

# Track concepts using text prompts
results = predictor(
    source="path/to/video.mp4",
    text=["person", "bicycle"],
    stream=True
)

# Process results
for r in results:
    r.show()  # Display frame with tracked objects

# Distill to a smaller model (hypothetical step)
# This would involve training a lightweight model on the annotated data

Challenges and ConsiderationsVocabulary Scope: SAM3 focuses on atomic visual concepts, and compositional reasoning may require additional models like Multimodal Large Language Models (MLLMs).
Rare Concepts: Performance on rare or fine-grained concepts might degrade without extensive fine-tuning.
Hardware Constraints: Ensuring the distilled model meets the specific latency and memory requirements of edge devices is crucial.

In summary, SAM3 distillation through PHD and tools like Roboflow Rapid allows for the creation of efficient, deployable models that retain much of SAM3's functionality, making advanced computer vision accessible on resource-constrained devices.

6 posts

7 web pages

any solutions with unsloth?

Yes, Unsloth offers solutions for distilling large language models (LLMs) like SAM3 into smaller, more efficient models suitable for edge devices. Here's how Unsloth can be integrated into the distillation process, based on the context and related web results:Unsloth's Role in DistillationUnsloth is an open-source framework designed to simplify and accelerate the fine-tuning and reinforcement learning of LLMs. It uses custom Triton kernels and algorithms to deliver significant performance gains, making it an excellent tool for distilling models like SAM3. Here's how it fits into the distillation process:1. Efficient Fine-TuningUnsloth supports parameter-efficient fine-tuning (PEFT) techniques like QLoRA (Quantized Low-Rank Adaptation), which reduce memory usage by 70%-80% without sacrificing quality. This is crucial for distilling large models into smaller ones that can run on edge devices.QLoRA: Enables fine-tuning models in 4-bit precision, cutting memory requirements significantly.
LoRA Adapters: Inject lightweight adapters into critical layers, avoiding the need to retrain billions of parameters.
SFTTrainer: Ensures loss computation only over assistant outputs, aligning fine-tuning closely with real-world usage.

2. Quantization-Aware Training (QAT)Unsloth, in collaboration with PyTorch and Meta, supports Quantization-Aware Training (QAT), which simulates quantization during training to prepare the model for deployment on edge devices. This is particularly relevant for SAM3 distillation, as it helps maintain accuracy while reducing model size.QAT Scheme: Use qat_scheme = "phone-deployment" to signify deployment to edge devices, which internally uses qat_scheme = "int8-int4" for efficient quantization.
Example: The Unsloth documentation provides a Colab notebook for deploying Qwen3-0.6B on Pixel 8 and iPhone 15 Pro at ~40 tokens/s, which can be adapted for SAM3 distillation.

3. Model Support and OptimizationUnsloth supports a wide range of models, including vision models, which are relevant for SAM3's capabilities. It optimizes training speed and memory efficiency, making it feasible to distill SAM3 into smaller models.Vision Models: Supports models like Llama 3.2 Vision, Qwen 2.5 VL, and Pixtral, which can be leveraged for vision tasks similar to SAM3.
Triton Kernels: Unsloth's use of Triton language for kernels ensures 3x faster training and 30% less VRAM usage, which is critical for handling large datasets during distillation.

4. Deployment on Edge DevicesUnsloth facilitates deployment on edge devices through its integration with ExecuTorch, a framework for on-device ML experiences. This is directly applicable to deploying distilled SAM3 models.ExecuTorch: Powers on-device ML for billions on Instagram, WhatsApp, etc., and supports hardware backends across Apple, Qualcomm, ARM, and Meta’s Quest 3 and Ray-Bans.
iOS and Android Deployment: Unsloth provides tutorials for deploying models on iPhones and Android devices, which can be adapted for SAM3-distilled models.

Example Workflow with UnslothHere's a conceptual workflow for distilling SAM3 using Unsloth, though the exact implementation would require adaptation:Step 1: Initialize and Fine-Tunepython

from unsloth import FastLanguageModel
import torch

# Initialize SAM3 or a similar vision model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="meta/sam3",  # Hypothetical SAM3 model name
    max_seq_length=1024,
    full_finetuning=True,
    qat_scheme="phone-deployment"
)

# Fine-tune on annotated data from SAM3 (e.g., basketball footage)
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=annotated_dataset,
    args=training_args
)
trainer.train()

Step 2: Quantize and Distillpython

# Apply QAT to prepare for edge deployment
model = model.to_qat("int8-int4")

# Distill to a smaller architecture (e.g., EfficientViT)
smaller_model = FastLanguageModel.from_pretrained(
    model_name="efficientvit-b0",  # Example small vision model
    max_seq_length=512
)

# Transfer knowledge using distillation techniques
distillation_trainer = DistillationTrainer(
    teacher_model=model,
    student_model=smaller_model,
    train_dataset=annotated_dataset
)
distillation_trainer.train()

Step 3: Deploy on Edge Devicespython

# Convert to ExecuTorch format for deployment
from executorch import convert_to_executorch

executorch_model = convert_to_executorch(smaller_model)

# Deploy on iOS or Android
# Follow Unsloth's deployment guides for specific device setup

Challenges and ConsiderationsModel Compatibility: Ensure the vision capabilities of SAM3 are preserved in the distilled model, which might require additional fine-tuning on vision-specific datasets.
Performance Trade-offs: Balance between model size, inference speed, and accuracy, as smaller models may not capture all nuances of SAM3.
Hardware Constraints: Test the distilled model on target edge devices to ensure it meets latency and memory requirements.

Related Web ResultsUnsloth Documentation: Provides detailed guides on fine-tuning and deploying models on edge devices, including QAT and ExecuTorch integration.
NVIDIA Technical Blog: Discusses scaling Unsloth workflows for production, which can be adapted for SAM3 distillation.
GitHub - unslothai/unsloth: Offers the latest updates and community support for distilling and deploying models.

In summary, Unsloth provides a robust framework for distilling SAM3 into smaller models through efficient fine-tuning, QAT, and deployment on edge devices, leveraging its optimization techniques and integration with ExecuTorch.

6 posts

8 web pages

can it be distilled to yolo?

Yes, SAM3 can be distilled into a YOLO model, leveraging the capabilities of both frameworks to create a smaller, more efficient model suitable for edge devices and real-time applications. Here's how this process can be conceptualized and implemented, drawing from the context and related web results:Why Distill SAM3 to YOLO?SAM3 excels at promptable concept segmentation and tracking, but its large size and computational demands make it less suitable for edge devices. YOLO, particularly versions like YOLOv8 or YOLO11, offers a lightweight, real-time object detection framework. Distilling SAM3 into a YOLO model combines SAM3's advanced segmentation and tracking abilities with YOLO's efficiency, enabling deployment on resource-constrained devices.Distillation ProcessThe distillation process involves transferring SAM3's knowledge (segmentation and tracking capabilities) into a YOLO model. This can be achieved through a method similar to the Progressive Hierarchical Distillation (PHD) described for SAM3, but adapted for YOLO architectures. Here's a step-by-step breakdown:1. Annotation and Data PreparationUse SAM3 for Auto-Annotation: Utilize SAM3's promptable segmentation capabilities to annotate a dataset. For example, in the X post, SAM3 auto-annotates basketball players and doors across video frames.
Format Annotations: Convert SAM3's segmentation masks into bounding boxes and class labels compatible with YOLO training. This step is crucial because YOLO primarily deals with bounding boxes rather than pixel-level segmentation.

2. Training the YOLO ModelChoose a YOLO Architecture: Select a lightweight YOLO model like YOLOv8n or YOLO11n, which are optimized for speed and efficiency.
Train on Annotated Data: Use the annotated dataset from SAM3 to train the YOLO model. This training can be guided by distillation techniques to ensure the YOLO model learns SAM3's segmentation and tracking behaviors.

3. Distillation TechniquesKnowledge Distillation: Implement knowledge distillation where SAM3 acts as the teacher model, and the YOLO model is the student. The student model learns to mimic the teacher's outputs (e.g., object detections and segmentations) but with a smaller parameter count.
Loss Functions: Use a combination of standard YOLO loss (e.g., bounding box regression, classification) and distillation loss (e.g., KL divergence between teacher and student outputs) to align the YOLO model's predictions with SAM3's.

4. Optimization for Edge DevicesQuantization: Apply quantization techniques, such as those supported by Unsloth or PyTorch, to further reduce the model size and inference time.
Pruning: Consider model pruning to remove unnecessary parameters, enhancing the model's efficiency without significant loss in performance.

Example WorkflowHere's a conceptual example of how this might be implemented, though the exact code would require adaptation based on the specific tools and frameworks used:Step 1: Auto-Annotate with SAM3python

from ultralytics.models.sam import SAM3VideoSemanticPredictor

# Initialize SAM3 for video segmentation
predictor = SAM3VideoSemanticPredictor(
    overrides=dict(
        conf=0.25,
        task="segment",
        mode="predict",
        imgsz=640,
        model="sam3.pt",
        half=True,
        save=True
    )
)

# Annotate video frames with text prompts
results = predictor(
    source="path/to/video.mp4",
    text=["player", "door"],
    stream=True
)

# Convert segmentation masks to YOLO-compatible annotations
# This step would involve processing results to extract bounding boxes and labels

Step 2: Train YOLO Model with Distillationpython

from ultralytics import YOLO
from torch.distilled import DistillationLoss  # Hypothetical distillation loss

# Initialize YOLO model
yolo_model = YOLO("yolo11n.pt")

# Define distillation loss
distillation_loss = DistillationLoss(teacher_model=sam3_model)

# Train YOLO model with distilled knowledge
yolo_model.train(
    data="path/to/annotated_dataset.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    device="cuda",
    optimizer="Adam",
    lr0=0.01,
    lrf=0.1,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=3.0,
    warmup_momentum=0.8,
    warmup_bias_lr=0.1,
    box=7.5,
    cls=0.5,
    dfl=1.5,
    pose=12.0,
    kobj=1.0,
    label_smoothing=0.0,
    nbs=64,
    overlap_mask=True,
    mask_ratio=4,
    dropout=0.0,
    val=True,
    save_json=False,
    save_hybrid=False,
    conf=None,
    iou=0.7,
    max_det=300,
    half=False,
    dnn=False,
    plots=True,
    source=None,
    show=False,
    save_txt=False,
    save_conf=False,
    save_crop=False,
    show_labels=True,
    show_conf=True,
    vid_stride=1,
    line_width=None,
    visualize=False,
    augment=False,
    agnostic_nms=False,
    classes=None,
    retina_masks=False,
    boxes=True,
    format="torchscript",
    keras=False,
    optimize=False,
    int8=False,
    dynamic=False,
    simplify=False,
    opset=None,
    workspace=4,
    nms=False,
    lr0_patience=100,
    save_period=-1,
    seed=0,
    project="runs/train",
    name="exp",
    exist_ok=False,
    pretrained=True,
    resume=False,
    cos_lr=False,
    freeze=[0],
    dist_loss=distillation_loss  # Hypothetical addition for distillation
)

Step 3: Deploy the Distilled YOLO Modelpython

# Export the model for edge deployment
yolo_model.export(format="onnx", dynamic=True, simplify=True)

# Deploy on edge devices using frameworks like TensorFlow Lite or OpenVINO

Challenges and ConsiderationsSegmentation to Detection: SAM3 provides pixel-level segmentation, while YOLO focuses on bounding boxes. Converting segmentation masks to bounding boxes may lose some detail, requiring careful annotation and potentially additional fine-tuning.
Performance Trade-offs: Ensure the distilled YOLO model maintains sufficient accuracy for the target application, as smaller models may not capture all nuances of SAM3.
Hardware Constraints: Test the deployed model on edge devices to ensure it meets latency and memory requirements.

Related Web ResultsUltralytics YOLO Docs: Discusses YOLO's capabilities and integration with other models, which can be leveraged for distillation.
Roboflow Blog: Provides insights into distilling large vision models into smaller ones, including YOLO, which can be adapted for SAM3.
ArXiv - EfficientSAM3: Details the PHD method, which can inspire the distillation process for YOLO.

In summary, distilling SAM3 into a YOLO model is feasible through auto-annotation, knowledge distillation, and optimization techniques. This approach combines SAM3's advanced capabilities with YOLO's efficiency, enabling deployment on edge devices for real-time applications.

how much would this cost per minute with streaming video?
https://rapid.roboflow.com/purple/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats/deploy
so Serverless Video Streams (cloud) is cheapest?
difference between segmentation mask vs boxes?
video streaming from iphone i would assume reduce the resolution before sending to 480p; 15fps
pov driver detecting cars, people, etc
real-time HUD overlay
iPhone 15 using expo
```
```
https://rapid.roboflow.com/purple
can i run run this model locally on my iphone?


# Roboflow Computer Vision Integration Guide

## Roboflow

Roboflow is a computer vision platform that allows you to train, deploy, and manage machine learning
models for image and video analysis. Their serverless API makes it easy to integrate pre-trained or
custom models into your applications without managing infrastructure. Common use cases include
object detection, classification, segmentation, and custom workflows.

**Official Documentation:**

- **Roboflow Hosted Models API Reference**
  https://docs.roboflow.com/deploy/serverless-hosted-api-v2/use-with-the-rest-api
- **API Reference:** https://docs.roboflow.com/api-reference

---

## Integrating Into Your App

The Roboflow workflow endpoint accepts an image (via URL or base64) and returns predictions from
your trained model.

- **Base Endpoint** https://serverless.roboflow.com
- **Endpoint:** https://serverless.roboflow.com/purple/workflows/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats
- **Input Image Types:** Can be a URL, base64-encoded string, or local file path (depending on
  implementation)

## Required For Integration:

- **API Key** Your API Key: 0Sh2tSQ9KHzMW6swJE8J Can be found in your dashboard at
  [app.roboflow.com](https://app.roboflow.com/purple/settings/api)
- **Workspace Name** Your Workspace: purple Can be found at app.roboflow.com, or from the
  URL: https://rapid.roboflow.com/purple/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats/deploy
- **Workflow ID** Your Workflow ID: find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats Can be found at app.roboflow.com, or from the
  URL: https://rapid.roboflow.com/purple/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats/deploy

## Dynamically Required at Runtime:

- **An Image** The image you want your model to analyze. Can be provided as a URL or base64-encoded
  string.

---

## Canonical Examples

### Curl With Remote Image URL


bash
curl --location 'https://serverless.roboflow.com/purple/workflows/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats' \
--header 'Content-Type: application/json' \
--data '{
    "api_key": "0Sh2tSQ9KHzMW6swJE8J",
    "inputs": {
        "image": {"type": "url", "value": "WWW.EXAMPLE.COM/IMAGE.JPG"}
    }
}'


### Curl with base-64 encoded local image


bash
# First, encode your image to base64
BASE64_IMAGE=$(base64 -w 0 path/to/your/image.jpg)

# Then make the API call
curl --location 'https://serverless.roboflow.com/purple/workflows/find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats' \
--header 'Content-Type: application/json' \
--data '{
  "api_key": "0Sh2tSQ9KHzMW6swJE8J",
  "inputs": {
       "image": {
           "type": "base64",
           "value": "$BASE64_IMAGE"
       }
   }
}"


### Python

**Python Option A: Using the official SDK (recommended):**


bash
pip install inference-sdk
# or
pip install requests pillow  # for custom implementation



python
from inference_sdk import InferenceHTTPClient

# Initialize client
# This project uses Roboflow for computer vision
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="0Sh2tSQ9KHzMW6swJE8J"
)

# Run inference on local image
result = client.run_workflow(
    workspace_name="purple",
    workflow_id="find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats",
    images={
        "image": "path/to/your/image.jpg"
    },
    use_cache=True  # Caches the model & workflow setup - only disable this if you are modifying your Roboflow model within 15 minutes.
)

print(result)


**Python Option B: Using requests (custom implementation):**


python
import requests
import base64
import json

def analyze_image(image_path, api_key, workspace, workflow_id):
    # Read and encode image
    with open(image_path, 'rb') as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

    # Prepare request to Roboflow, which we use for computer vision / image analysis
    url = f"https://serverless.roboflow.com/purple/workflows/{workflow_id}"
    payload = {
        "api_key": api_key,
        "inputs": {
            "image": {
                "type": "base64",
                "value": encoded_image
            }
        }
    }

    # Make request
    response = requests.post(url, json=payload)
    return response.json()

# Usage
result = analyze_image(
    image_path="path/to/your/image.jpg",
    api_key="YOUR_API_KEY",
    workspace="purple",
    workflow_id="find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats"
)
print(json.dumps(result, indent=2))


**Python: Processing video frames:**


python
import cv2
from inference_sdk import InferenceHTTPClient

# This project uses Roboflow for video analysis
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="0Sh2tSQ9KHzMW6swJE8J"
)

# Open video
video = cv2.VideoCapture('path/to/video.mp4')
frame_count = 0

while video.isOpened():
    ret, frame = video.read()
    if not ret:
        break

    # Process every 10th frame (adjust as needed)
    if frame_count % 10 == 0:
        # Save frame temporarily
        temp_path = 'temp_frame.jpg'
        cv2.imwrite(temp_path, frame)

        # Run inference
        result = client.run_workflow(
            workspace_name="purple",
            workflow_id="find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats",
            images={"image": temp_path}
        )

        print(f"Frame {frame_count}: {result}")

    frame_count += 1

video.release()


**Node.js:**


bash
npm install node-fetch
# or use built-in fetch (Node.js 18+). Check your node version with node --version


### Examples: JavaScript/Node.js - Local Image

**Using built-in fetch (Node.js 18+):** This code can only be run server-side because it uses the
secret apikey.


javascript
const fs = require("fs");

async function analyzeImage(imagePath, apiKey, workspace, workflowId) {
    // Read and encode image
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Make request to Roboflow to run the computer vision model
    const response = await fetch(
        `https://serverless.roboflow.com/$purple/workflows/${workflowId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: apiKey,
                inputs: { image: { type: "base64", value: base64Image } }
            })
        }
    );

    return await response.json();
}

// Usage
analyzeImage("./path/to/image.jpg", "YOUR_API_KEY", "purple", "find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats")
    .then((result) => {
        console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error("Error:", error);
    });


**Javascript with Remote Image URL** Example for reading from cloud storage, such as an S3 URL, or
temporary file location where your users upload files, or user-provided image URL you want to
analyze.


javascript
async function analyzeImageURL(imageUrl, apiKey, workspace, workflowId) {
    const response = await fetch(
        `https://serverless.roboflow.com/$purple/workflows/${workflowId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: apiKey,
                inputs: { image: { type: "url", value: imageUrl } }
            })
        }
    );

    return await response.json();
}

// Usage
analyzeImageURL(
    "https://example.com/image.jpg",
    "YOUR_API_KEY",
    "purple",
    "{workflow_id}"
).then((result) => {
    console.log(result);
});


---

## Integration Examples for Existing Codebases

### Scenario 1: Express.js Web Server


javascript
const express = require("express");
const multer = require("multer");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

// place in proper config loading location to retrieve API Keys
const ROBOFLOW_CONFIG = {
    apiUrl: "https://serverless.roboflow.com",
    apiKey: "YOUR_API_KEY",
    workspace: "purple",
    workflowId: "find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats"
};

// Implement at a route
app.post("/analyze-image", upload.single("image"), async (req, res) => {
    // Uses Roboflow to run our custom computer vision model
    try {
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString("base64");

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

        const result = await response.json();

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));


### Scenario 2: Flask API (Python)


python
from flask import Flask, request, jsonify
from inference_sdk import InferenceHTTPClient
import os

app = Flask(__name__)

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=os.getenv("ROBOFLOW_API_KEY")
)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image = request.files['image']
    temp_path = f'/tmp/{image.filename}'
    image.save(temp_path)

    try:
        result = client.run_workflow(
            workspace_name="purple",
            workflow_id="{workflow_id}",
            images={"image": temp_path}
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(debug=True)


---

### Batch Processing

If processing a large number of images, batch processing is substantially more efficient. We
strongly recommend using this for video analysis.


python
import os
from inference_sdk import InferenceHTTPClient

# Use Roboflow for AI video analysis
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="YOUR_API_KEY"
)

image_folder = "path/to/images"
results = []

for filename in os.listdir(image_folder):
    if filename.endswith(('.jpg', '.jpeg', '.png')):
        image_path = os.path.join(image_folder, filename)

        result = client.run_workflow(
            workspace_name="purple",
            workflow_id="find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats",
            images={"image": image_path}
        )

        results.append({
            'filename': filename,
            'predictions': result
        })

print(f"Processed {len(results)} images")


### Real-Time Webcam Processing

This python script can be run to process images live from your computer's webcam. Useful for
creating a demo, or quickly testing your model on things nearby.


python
import cv2
from inference_sdk import InferenceHTTPClient

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="YOUR_API_KEY"
)

cap = cv2.VideoCapture(0)  # Open webcam

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Save frame temporarily
    cv2.imwrite('temp.jpg', frame)

    # Run inference
    result = client.run_workflow(
        workspace_name="purple",
        workflow_id="find-people-cars-dogs-animals-cyclists-bicycles-motorcycles-scooters-vans-semi-trucks-trucks-electric-scooters-school-buses-ambulance-lights-buses-police-cruisers-police-motorcycles-police-suvs-police-cars-ambulances-firetrucks-wheelchairs-and-cats",
        images={"image": "temp.jpg"}
    )

    # Display results (customize based on your model output)
    cv2.imshow('Webcam', frame)
    print(result)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()


---

## API Response Examples

Models created on Roboflow Rapid are hosted on Roboflow Workflows URLs. A successful API response
will be JSON with many possible keys.

All successful responses from Roboflow Rapid will contain the following keys: outputs.predictions
outputs.predictions.image outputs.predictions.predictions

outputs.visualization

Example of a successful response:


json
{
    "outputs": [
        {
            "predictions": {
                "image": { "width": 698, "height": 924 },
                "predictions": [
                    {
                        "width": 94.57489013671875,
                        "height": 46.71661376953125,
                        "x": 412.1963195800781,
                        "y": 357.73590087890625,
                        "confidence": 0.4383268654346466,
                        "class_id": 0,
                        "class": "class-name",
                        "detection_id": "58b3b66b-3caf-418a-9ba6-184a6f2302cf",
                        "parent_id": "image"
                    }
                ]
            },
            "visualization": {
                "type": "base64",
                "value": "BASE64_ENCODED_STRING_HERE",
                "video_metadata": {
                    "video_identifier": "image",
                    "frame_number": 0,
                    "frame_timestamp": "2025-10-06T20:33:23.069633",
                    "fps": 30,
                    "measured_fps": null,
                    "comes_from_video_file": null
                }
            }
        }
    ],
    "profiler_trace": []
}


## Best Practices

### Security

- **Never hardcode API keys** in client-side code
- Store API keys in environment variables or secure configuration
- Use server-side proxy endpoints for client applications

### Performance

- **Cache workflow definitions** using use_cache: true (SDK only)
- Process video frames selectively (every Nth frame) rather than every frame
- Use image URLs when possible to reduce data transfer
Can you download sam3 model to train the yolo model? Or use the api to label images to train yolo
```
vision training template
https://github.com/mfranzon/yolo-training-template
https://x.com/UnslothAI/status/2000936703830134977?s=20
https://www.youtube.com/watch?v=9t-BAjzBWj8