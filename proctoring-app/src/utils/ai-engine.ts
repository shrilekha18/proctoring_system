import * as faceMesh from '@mediapipe/face_mesh';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface DetectionResult {
  faces: faceMesh.NormalizedLandmark[][];
  objects: cocoSsd.DetectedObject[];
  headPose: { yaw: number; pitch: number; roll: number };
  lookingAway: boolean;
}

export class AIEngine {
  private faceMeshModel: faceMesh.FaceMesh;
  private cocoSsdModel: cocoSsd.ObjectDetection | null = null;
  private isLoaded = false;

  constructor(onResults: (results: DetectionResult) => void) {
    this.faceMeshModel = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMeshModel.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMeshModel.onResults((results) => {
      const faceResults = results.multiFaceLandmarks || [];
      const objects: cocoSsd.DetectedObject[] = []; // Will be populated by cocoSsd
      
      const headPose = this.calculateHeadPose(faceResults[0]);
      const lookingAway = this.isLookingAway(headPose);

      onResults({
        faces: faceResults,
        objects,
        headPose,
        lookingAway,
      });
    });
  }

  async load() {
    if (this.isLoaded) return;
    this.cocoSsdModel = await cocoSsd.load();
    this.isLoaded = true;
  }

  async detect(video: HTMLVideoElement) {
    if (!this.isLoaded || !this.cocoSsdModel) return;

    // Run MediaPipe FaceMesh
    await this.faceMeshModel.send({ image: video });

    // Run TensorFlow COCO-SSD for object detection (mobile phones)
    const objects = await this.cocoSsdModel.detect(video);
    const phones = objects.filter(obj => obj.class === 'cell phone');
    
    return phones;
  }

  private calculateHeadPose(landmarks?: faceMesh.NormalizedLandmark[]) {
    if (!landmarks) return { yaw: 0, pitch: 0, roll: 0 };

    // Simple head pose estimation based on nose and eye positions
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // Horizontal movement (Yaw)
    const yaw = (nose.x - (leftEye.x + rightEye.x) / 2) * 100;
    
    // Vertical movement (Pitch)
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) * 100;

    return { yaw, pitch, roll: 0 }; // Roll is more complex to calculate simply
  }

  private isLookingAway(pose: { yaw: number; pitch: number }) {
    return Math.abs(pose.yaw) > 15 || Math.abs(pose.pitch) > 15;
  }
}
