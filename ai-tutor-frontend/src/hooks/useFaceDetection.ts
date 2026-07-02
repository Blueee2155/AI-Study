import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@mediapipe/face_mesh';

export type StudyStatus = 'loading' | 'focused' | 'distracted' | 'drowsy' | 'away' | 'error';

interface DetectionResult {
  status: StudyStatus;
  ear: number;
  headYaw: number;
  headPitch: number;
}

// Eye Aspect Ratio: measures eye openness from 6 landmarks per eye
function calculateEAR(landmarks: number[][], eyePoints: number[]): number {
  const [p1, p2, p3, p4, p5, p6] = eyePoints.map(i => landmarks[i]);
  const vDist = Math.hypot(p2[1] - p6[1], p2[0] - p6[0]) + Math.hypot(p3[1] - p5[1], p3[0] - p5[0]);
  const hDist = 2 * Math.hypot(p1[1] - p4[1], p1[0] - p4[0]);
  return hDist === 0 ? 1 : vDist / hDist;
}

// Simplified head pose from nose bridge and chin vectors
function estimateHeadPose(landmarks: number[][]): { yaw: number; pitch: number } {
  const noseTip = landmarks[1];
  const noseBridge = landmarks[6];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  const dx = rightCheek[0] - leftCheek[0];
  const dy = rightCheek[1] - leftCheek[1];
  const yaw = dx === 0 ? 0 : Math.atan((noseTip[0] - (leftCheek[0] + rightCheek[0]) / 2) / (dx * 0.5)) * (180 / Math.PI);

  const vx = noseBridge[0] - chin[0];
  const vy = noseBridge[1] - chin[1];
  const pitch = Math.atan2(vy, vx) * (180 / Math.PI) - 90;

  return { yaw, pitch };
}

const LEFT_EYE_POINTS = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_POINTS = [362, 385, 387, 263, 373, 380];
const EAR_DROWSY_THRESHOLD = 0.20;
const HEAD_YAW_THRESHOLD = 26;
const DROWSY_DURATION_MS = 3000;
const AWAY_DURATION_MS = 10000;
const MIN_FACE_AREA_RATIO = 0.035;
const MAX_FACE_AREA_RATIO = 0.55;

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const [status, setStatus] = useState<StudyStatus>('loading');
  const [detector, setDetector] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const statusRef = useRef<StudyStatus>('loading');
  const drowsySince = useRef<number>(0);
  const awaySince = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      setError('无法访问摄像头。请确保已授权摄像头访问权限。');
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const d = await faceLandmarksDetection.createDetector(model, {
          runtime: 'mediapipe',
          refineLandmarks: true,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        });
        if (!cancelled) {
          setDetector(d);
          setStatus('focused');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function isValidFace(face: faceLandmarksDetection.Face) {
    const video = videoRef.current;
    if (!video || !face.keypoints || face.keypoints.length < 120) return false;
    const xs = face.keypoints.map(kp => kp.x).filter(Number.isFinite);
    const ys = face.keypoints.map(kp => kp.y).filter(Number.isFinite);
    if (xs.length < 120 || ys.length < 120) return false;
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (width <= 0 || height <= 0) return false;
    const areaRatio = (width * height) / (video.videoWidth * video.videoHeight);
    const aspectRatio = width / height;
    return areaRatio >= MIN_FACE_AREA_RATIO
      && areaRatio <= MAX_FACE_AREA_RATIO
      && aspectRatio >= 0.55
      && aspectRatio <= 1.55;
  }

  const detect = useCallback(async () => {
    if (!detector || !videoRef.current || !enabled) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      const faces = (await detector.estimateFaces(video)).filter(isValidFace);
      const now = Date.now();

      if (faces.length === 0) {
        if (awaySince.current === 0) awaySince.current = now;
        if (now - awaySince.current > AWAY_DURATION_MS) {
          updateStatus('away');
        }
        return;
      }
      awaySince.current = 0;

      const face = faces[0];
      const landmarks = face.keypoints.map((kp: { x: number; y: number; z?: number }) => [kp.x, kp.y]);

      const leftEAR = calculateEAR(landmarks, LEFT_EYE_POINTS);
      const rightEAR = calculateEAR(landmarks, RIGHT_EYE_POINTS);
      const ear = (leftEAR + rightEAR) / 2;

      const { yaw } = estimateHeadPose(landmarks);

      // Determine status
      if (ear < EAR_DROWSY_THRESHOLD) {
        if (drowsySince.current === 0) drowsySince.current = now;
        if (now - drowsySince.current > DROWSY_DURATION_MS) {
          updateStatus('drowsy');
          return;
        }
      } else {
        drowsySince.current = 0;
      }

      if (Math.abs(yaw) > HEAD_YAW_THRESHOLD) {
        updateStatus('distracted');
        return;
      }

      updateStatus('focused');
    } catch {
      // silently skip frame errors
    }
  }, [detector, videoRef, enabled]);

  function updateStatus(newStatus: StudyStatus) {
    if (statusRef.current !== newStatus) {
      statusRef.current = newStatus;
      setStatus(newStatus);
    }
  }

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      detect();
      rafRef.current = requestAnimationFrame(() => setTimeout(loop, 500));
    };
    if (detector && enabled) loop();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [detector, enabled, detect]);

  return { status, detector, videoRef, canvasRef, error, isCameraActive, startCamera, stopCamera };
}
