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
    const VERSION = '0.4.1633502946';
    this.faceMeshModel = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}/${file}`,
    });

    this.faceMeshModel.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMeshModel.onResults((results) => {
      const faceResults = results.multiFaceLandmarks || [];
      const objects: cocoSsd.DetectedObject[] = []; 
      
      const headPose = faceResults[0] ? this.calculateHeadPose(faceResults[0]) : { yaw: 0, pitch: 0, roll: 0 };
      const lookingAway = faceResults[0] ? this.isLookingAway(headPose) : false;

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

  public compareFaces(refLandmarks: faceMesh.NormalizedLandmark[], currentLandmarks: faceMesh.NormalizedLandmark[]): number {
    if (!refLandmarks || !currentLandmarks || refLandmarks.length !== currentLandmarks.length) return 0;
    
    // Translation invariance: Center landmarks on nose (index 1)
    const refNose = refLandmarks[1];
    const currNose = currentLandmarks[1];

    // Scale invariance: Use distance between eyes as a scale factor
    // Left eye outer: 33, Right eye outer: 263
    const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    const refScale = getDist(refLandmarks[33], refLandmarks[263]);
    const currScale = getDist(currentLandmarks[33], currentLandmarks[263]);
    
    if (refScale === 0 || currScale === 0) return 0;

    let totalDist = 0;
    // We only need to compare key points for efficiency and stability
    // Using a subset of landmarks (e.g., every 5th) or specific facial features
    const keyIndices = [1, 33, 263, 61, 291, 199, 10, 152]; // Nose, eyes, mouth corners, chin, forehead
    
    for (const i of keyIndices) {
      const refX = (refLandmarks[i].x - refNose.x) / refScale;
      const refY = (refLandmarks[i].y - refNose.y) / refScale;
      const currX = (currentLandmarks[i].x - currNose.x) / currScale;
      const currY = (currentLandmarks[i].y - currNose.y) / currScale;
      
      totalDist += Math.sqrt(Math.pow(refX - currX, 2) + Math.pow(refY - currY, 2));
    }
    
    const avgDist = totalDist / keyIndices.length;
    // Similarity score: 1 is perfect match, 0 is no match
    // 0.4 is a good empirical threshold for centered/scaled points
    return Math.max(0, 1 - (avgDist / 0.5));
  }

  private isLookingAway(pose: { yaw: number; pitch: number }) {
    // Increased sensitivity: 8 degrees instead of 15
    return Math.abs(pose.yaw) > 8 || Math.abs(pose.pitch) > 8;
  }
}
