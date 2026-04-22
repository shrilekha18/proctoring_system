import * as faceMesh from '@mediapipe/face_mesh';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface DetectionResult {
  faces: faceMesh.NormalizedLandmark[][];
  objects: cocoSsd.DetectedObject[];
  headPose: { yaw: number; pitch: number; roll: number };
  lookingAway: boolean;
  isCentered: boolean;
  distanceStatus: 'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR';
}

interface Point {
  x: number;
  y: number;
}

export class AIEngine {
  private faceMeshModel: faceMesh.FaceMesh;
  private cocoSsdModel: cocoSsd.ObjectDetection | null = null;
  private isLoaded = false;

  constructor(onResults: (results: DetectionResult) => void) {
    const VERSION = '0.4.1633559619';
    this.faceMeshModel = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}/${file}`,
    });

    this.faceMeshModel.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    this.faceMeshModel.onResults((results) => {
      const faceResults = results.multiFaceLandmarks || [];
      const objects: cocoSsd.DetectedObject[] = []; 
      
      const headPose = faceResults[0] ? this.calculateHeadPose(faceResults[0]) : { yaw: 0, pitch: 0, roll: 0 };
      const positionalMetrics = faceResults[0] ? this.getFacePositionMetrics(faceResults[0]) : { isCentered: true, distanceStatus: 'OPTIMAL' as const };
      
      const lookingAway = faceResults[0] ? this.isLookingAwayStrict(faceResults[0], headPose) : false;

      onResults({
        faces: faceResults,
        objects,
        headPose,
        lookingAway,
        isCentered: positionalMetrics.isCentered,
        distanceStatus: positionalMetrics.distanceStatus
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
    await this.faceMeshModel.send({ image: video });
    const objects = await this.cocoSsdModel.detect(video);
    return objects.filter(obj => obj.class === 'cell phone' || obj.class === 'person' && obj.score > 0.8);
  }

  public calculateHeadPose(landmarks: faceMesh.NormalizedLandmark[]) {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    const leftDist = Math.sqrt(Math.pow(nose.x - leftEye.x, 2) + Math.pow(nose.y - leftEye.y, 2));
    const rightDist = Math.sqrt(Math.pow(nose.x - rightEye.x, 2) + Math.pow(nose.y - rightEye.y, 2));
    const yaw = ((leftDist - rightDist) / (leftDist + rightDist)) * 100;
    
    const topDist = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2));
    const bottomDist = Math.sqrt(Math.pow(nose.x - chin.x, 2) + Math.pow(nose.y - chin.y, 2));
    const pitch = ((topDist - bottomDist) / (topDist + bottomDist)) * 100 - 5;

    return { yaw, pitch, roll: 0 };
  }

  private getFacePositionMetrics(landmarks: faceMesh.NormalizedLandmark[]) {
    const nose = landmarks[1];
    const isCentered = nose.x > 0.35 && nose.x < 0.65;
    
    const eyeDist = Math.sqrt(Math.pow(landmarks[33].x - landmarks[263].x, 2) + Math.pow(landmarks[33].y - landmarks[263].y, 2));
    
    let distanceStatus: 'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR' = 'OPTIMAL';
    if (eyeDist > 0.35) distanceStatus = 'TOO_CLOSE';
    else if (eyeDist < 0.12) distanceStatus = 'TOO_FAR';

    return { isCentered, distanceStatus };
  }

  private isLookingAwayStrict(landmarks: faceMesh.NormalizedLandmark[], pose: { yaw: number; pitch: number }) {
    if (Math.abs(pose.yaw) > 18 || Math.abs(pose.pitch) > 18) return true;

    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    
    if (leftIris && rightIris) {
      const leftEyeWidth = Math.abs(landmarks[33].x - landmarks[133].x);
      const rightEyeWidth = Math.abs(landmarks[362].x - landmarks[263].x);
      
      const leftGazeRatio = (leftIris.x - landmarks[33].x) / leftEyeWidth;
      const rightGazeRatio = (rightIris.x - landmarks[362].x) / rightEyeWidth;

      if (leftGazeRatio < 0.15 || leftGazeRatio > 0.85 || rightGazeRatio < 0.15 || rightGazeRatio > 0.85) {
        return true;
      }
    }

    return false;
  }

  public compareFaces(refLandmarks: faceMesh.NormalizedLandmark[], currentLandmarks: faceMesh.NormalizedLandmark[]): number {
    if (!refLandmarks || !currentLandmarks || refLandmarks.length !== currentLandmarks.length) return 0;
    const refNose = refLandmarks[1];
    const currNose = currentLandmarks[1];
    const getDist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const refScale = getDist(refLandmarks[33], refLandmarks[263]);
    const currScale = getDist(currentLandmarks[33], currentLandmarks[263]);
    if (refScale === 0 || currScale === 0) return 0;

    let totalDist = 0;
    const keyIndices = [33, 133, 159, 145, 263, 362, 386, 374, 1, 10, 152, 61, 291, 13, 14];
    for (const i of keyIndices) {
      const refX = (refLandmarks[i].x - refNose.x) / refScale;
      const refY = (refLandmarks[i].y - refNose.y) / refScale;
      const currX = (currentLandmarks[i].x - currNose.x) / currScale;
      const currY = (currentLandmarks[i].y - currNose.y) / currScale;
      totalDist += Math.sqrt(Math.pow(refX - currX, 2) + Math.pow(refY - currY, 2));
    }
    return Math.max(0, 1 - (totalDist / keyIndices.length / 0.5));
  }

  public isMouthMoving(landmarks: faceMesh.NormalizedLandmark[]): boolean {
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const distance = Math.sqrt(Math.pow(topLip.x - bottomLip.x, 2) + Math.pow(topLip.y - bottomLip.y, 2));
    const faceHeight = Math.sqrt(Math.pow(landmarks[10].x - landmarks[152].x, 2) + Math.pow(landmarks[10].y - landmarks[152].y, 2));
    return (distance / faceHeight) > 0.035;
  }

  public getFeatureBoxes(landmarks: faceMesh.NormalizedLandmark[]) {
    const getBox = (indices: number[]) => {
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (const i of indices) {
        const p = landmarks[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const padding = 0.01;
      return {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.min(1, maxX + padding) - Math.max(0, minX - padding),
        height: Math.min(1, maxY + padding) - Math.max(0, minY - padding)
      };
    };
    return {
      leftEye: getBox([33, 133, 159, 145, 468]),
      rightEye: getBox([263, 362, 386, 374, 473]),
      mouth: getBox([61, 291, 13, 14])
    };
  }

  public getBoundingBox(landmarks: faceMesh.NormalizedLandmark[]) {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const padding = 0.05;
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(1, maxX + padding) - Math.max(0, minX - padding),
      height: Math.min(1, maxY + padding) - Math.max(0, minY - padding)
    };
  }
}
