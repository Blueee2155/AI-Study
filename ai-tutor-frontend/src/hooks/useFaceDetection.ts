import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs'; // TF.js backend (WebGL) for tfjs runtime
import { detectFaceFromFrame } from '@/services/api';

export type StudyStatus = 'loading' | 'focused' | 'distracted' | 'drowsy' | 'away' | 'error';

interface DetectionResult {
  status: StudyStatus;
  headYaw: number;
  headPitch: number;
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

const HEAD_YAW_THRESHOLD = 26;
const PITCH_DOWN_THRESHOLD = 30; // 低头角度阈值
const AWAY_DURATION_MS = 10000;
const MIN_FACE_AREA_RATIO = 0.035;
const MAX_FACE_AREA_RATIO = 0.55;
const WINDOW_SIZE = 10; // 滑动窗口大小
const EAR_THRESHOLD = 0.2;
const PERCLOS_WINDOW = 60; // 最近60帧（约30秒）
const PERCLOS_THRESHOLD = 0.4;

// 计算EAR (Eye Aspect Ratio)
function calculateEAR(landmarks: number[][]): number {
  // 左眼EAR
  const leftVertical = Math.hypot(
    landmarks[159][0] - landmarks[145][0],
    landmarks[159][1] - landmarks[145][1]
  );
  const leftHorizontal = Math.hypot(
    landmarks[33][0] - landmarks[133][0],
    landmarks[33][1] - landmarks[133][1]
  );
  const leftEAR = leftHorizontal === 0 ? 0 : leftVertical / leftHorizontal;

  // 右眼EAR
  const rightVertical = Math.hypot(
    landmarks[386][0] - landmarks[374][0],
    landmarks[386][1] - landmarks[374][1]
  );
  const rightHorizontal = Math.hypot(
    landmarks[362][0] - landmarks[263][0],
    landmarks[362][1] - landmarks[263][1]
  );
  const rightEAR = rightHorizontal === 0 ? 0 : rightVertical / rightHorizontal;

  return (leftEAR + rightEAR) / 2;
}

// 状态标签映射
const STATUS_LABELS: Record<StudyStatus, string> = {
  loading: '加载中',
  focused: '专注',
  distracted: '分心',
  drowsy: '疲劳',
  away: '离开',
  error: '异常',
};

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const [status, setStatus] = useState<StudyStatus>('loading');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detector, setDetector] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const statusRef = useRef<StudyStatus>('loading');
  const awaySince = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 时序平滑相关状态
  const statusHistory = useRef<StudyStatus[]>([]); // 最近N帧的状态历史
  const lastStableStatus = useRef<StudyStatus>('focused'); // 上次稳定状态(用于滞回)
  const earHistory = useRef<number[]>([]); // EAR历史记录用于PERCLOS

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
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
          runtime: 'tfjs', // 使用tfjs运行时，避免MediaPipe WASM加载问题
          refineLandmarks: true,
        });
        if (!cancelled) {
          setDetector(d);
          setStatus('focused');
        }
      } catch (err) {
        console.warn('[FaceDetection] Local model loading failed, will use backend API:', err);
        if (!cancelled) {
          // 本地模型加载失败不影响后端API检测，设置为focused等待后端API结果
          setDetector(null);
          setStatus('focused');
        }
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
    if (!videoRef.current || !enabled) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      // 尝试调用后端视觉检测API（不依赖本地detector）
      let backendResult = null;
      try {
        // 将视频帧转换为base64
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          // 调用后端API
          backendResult = await detectFaceFromFrame(imageBase64);
        }
      } catch (err) {
        // 后端API调用失败，继续使用本地MediaPipe检测
        console.log('Backend vision API unavailable, using local MediaPipe:', err);
      }

      // 如果后端API成功返回结果，直接使用后端状态
      if (backendResult && backendResult.status) {
        const statusMap: Record<string, StudyStatus> = {
          '专注': 'focused',
          '分心': 'distracted',
          '疲劳': 'drowsy',
          '困倦': 'drowsy',
          '离开': 'away',
          '开小差': 'distracted',  // 修正：开小差应该映射到 distracted 而非 drowsy
        };
        const mappedStatus = statusMap[backendResult.status] || 'focused';
        
        // 更新置信度状态（无论是否有人脸都更新）
        const conf = backendResult.confidence || backendResult.focus_score;
        setConfidence(typeof conf === 'number' ? conf : null);
        
        // 绘制后端返回的人脸框和状态标签（即使无人脸也绘制标签）
        drawBackendFaces(backendResult.faces || [], mappedStatus, conf);
        
        // 更新状态历史
        statusHistory.current.push(mappedStatus);
        if (statusHistory.current.length > WINDOW_SIZE) {
          statusHistory.current.shift();
        }
        updateStatusWithHysteresis(mappedStatus);
        return;
      }

      // 后端API不可用，使用本地MediaPipe检测（需要detector已加载）
      if (!detector) {
        // 本地detector未加载，跳过本帧
        return;
      }
      const faces = (await detector.estimateFaces(video)).filter(isValidFace);
      const now = Date.now();

      if (faces.length === 0) {
        clearCanvas();
        if (awaySince.current === 0) awaySince.current = now;
        if (now - awaySince.current > AWAY_DURATION_MS) {
          // 更新状态历史
          statusHistory.current.push('away');
          if (statusHistory.current.length > WINDOW_SIZE) {
            statusHistory.current.shift();
          }
          updateStatusWithHysteresis('away');
        }
        return;
      }
      awaySince.current = 0;

      const face = faces[0];
      const landmarks = face.keypoints.map((kp: { x: number; y: number; z?: number }) => [kp.x, kp.y]);

      const { yaw, pitch } = estimateHeadPose(landmarks);

      // Determine raw status based on head pose only (no eye detection)
      let rawStatus: StudyStatus = 'focused';
      
      // 1. 头部偏航角检测分心
      if (Math.abs(yaw) > HEAD_YAW_THRESHOLD) {
        rawStatus = 'distracted';
      }
      
      // 2. 俯仰角检测低头疲劳
      if (rawStatus === 'focused' && pitch > PITCH_DOWN_THRESHOLD) {
        rawStatus = 'drowsy';
      }

      // 3. PERCLOS眨眼检测疲劳
      if (rawStatus === 'focused' && landmarks.length >= 468) {
        const ear = calculateEAR(landmarks);
        earHistory.current.push(ear);
        if (earHistory.current.length > PERCLOS_WINDOW) earHistory.current.shift();

        // PERCLOS计算
        if (earHistory.current.length >= 10) {
          const closedCount = earHistory.current.filter(e => e < EAR_THRESHOLD).length;
          const perclos = closedCount / earHistory.current.length;
          if (perclos > PERCLOS_THRESHOLD) {
            rawStatus = 'drowsy';
          }
        }
      }

      // 绘制人脸框
      drawFaceBoxes(faces, rawStatus);

      // 更新状态历史
      statusHistory.current.push(rawStatus);
      if (statusHistory.current.length > WINDOW_SIZE) {
        statusHistory.current.shift();
      }

      // 使用滑动窗口多数投票和滞回逻辑更新最终状态
      const votedStatus = getMajorityVote();
      updateStatusWithHysteresis(votedStatus);
    } catch {
      // silently skip frame errors
    }
  }, [detector, videoRef, enabled]);

  // 滑动窗口多数投票
  function getMajorityVote(): StudyStatus {
    if (statusHistory.current.length < WINDOW_SIZE) {
      return statusHistory.current.length > 0 ? statusHistory.current[statusHistory.current.length - 1] : 'focused';
    }
    
    const counts: Record<StudyStatus, number> = {
      loading: 0,
      focused: 0,
      distracted: 0,
      drowsy: 0,
      away: 0,
      error: 0,
    };
    
    statusHistory.current.forEach(s => {
      counts[s]++;
    });
    
    let maxCount = 0;
    let majority = 'focused' as StudyStatus;
    for (const [s, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        majority = s as StudyStatus;
      }
    }
    
    return majority;
  }

  // 带滞回的状态更新逻辑
  function updateStatusWithHysteresis(newRawStatus: StudyStatus): void {
    const currentStable = lastStableStatus.current;
    
    // 如果是相同状态,直接返回
    if (currentStable === newRawStatus) {
      updateStatus(newRawStatus);
      return;
    }
    
    // 滞回阈值: 从专注切换到其他状态需要更严格的条件
    if (currentStable === 'focused') {
      // 从专注切换出去需要更强的证据
      if (newRawStatus === 'distracted') {
        // 需要连续多帧检测到分心才切换
        const distractedCount = statusHistory.current.slice(-5).filter(s => s === 'distracted').length;
        if (distractedCount >= 4) {
          updateStatus(newRawStatus);
          lastStableStatus.current = newRawStatus;
        }
      } else if (newRawStatus === 'drowsy') {
        // 疲劳检测已有持续时间要求,直接使用
        updateStatus(newRawStatus);
        lastStableStatus.current = newRawStatus;
      } else {
        updateStatus(newRawStatus);
        lastStableStatus.current = newRawStatus;
      }
    } else {
      // 从非专注状态恢复为专注需要更多证据
      if (newRawStatus === 'focused') {
        const focusedCount = statusHistory.current.slice(-5).filter(s => s === 'focused').length;
        if (focusedCount >= 4) {
          updateStatus(newRawStatus);
          lastStableStatus.current = newRawStatus;
        }
      } else {
        updateStatus(newRawStatus);
        lastStableStatus.current = newRawStatus;
      }
    }
  }

  // 绘制后端返回的人脸框和状态标签
  function drawBackendFaces(
    faces: Array<{ bbox: [number, number, number, number]; score: number; source: string }>,
    currentStatus: StudyStatus,
    confidence?: number
  ) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 构建标签文字（始终生成）
    const label = STATUS_LABELS[currentStatus] || '未知';
    const confText = confidence != null && confidence > 0 ? ` ${Math.round(confidence)}%` : '';
    const fullLabel = `${label}${confText}`;

    // 绘制人脸框
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // 前置摄像头镜像

    for (const face of faces) {
      const bbox = face.bbox;
      if (!bbox || bbox.length !== 4) continue;

      const [x, y, w, h] = bbox;

      // 绘制绿色矩形框（应用镜像变换）
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();

    // 绘制文字标签（不应用镜像变换，手动计算镜像坐标）
    if (faces.length > 0) {
      // 有人脸时，标签绘制在人脸框上方
      for (const face of faces) {
        const bbox = face.bbox;
        if (!bbox || bbox.length !== 4) continue;

        const [x, y, w, h] = bbox;
        ctx.font = 'bold 16px Arial';
        const textWidth = ctx.measureText(fullLabel).width;
        // 镜像后的坐标：mirrorX = canvas.width - x
        const mirroredX = canvas.width - x - w;
        // 确保标签不超出canvas左边界
        const labelX = Math.max(0, mirroredX);
        const labelY = Math.max(20, y - 8);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(labelX, labelY - 18, textWidth + 12, 22);
        ctx.fillStyle = '#000000';
        ctx.fillText(fullLabel, labelX + 6, labelY - 2);
      }
    } else {
      // 无人脸时，在canvas右上角固定位置显示状态标签
      ctx.font = 'bold 16px Arial';
      const textWidth = ctx.measureText(fullLabel).width;
      const padX = 10;
      const padY = 30;
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(canvas.width - textWidth - padX - 12, padY - 18, textWidth + 12, 22);
      ctx.fillStyle = '#000000';
      ctx.fillText(fullLabel, canvas.width - textWidth - padX - 6, padY - 2);
    }
  }

  // 清除canvas
  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // 绘制人脸边界框
  function drawFaceBoxes(faces: faceLandmarksDetection.Face[], currentStatus: StudyStatus) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸与视频一致
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 清除上一帧
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 前置摄像头镜像效果
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    for (const face of faces) {
      if (!face.keypoints || face.keypoints.length === 0) continue;

      const xs = face.keypoints.map(kp => kp.x);
      const ys = face.keypoints.map(kp => kp.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      // 绘制绿色矩形框（应用镜像变换）
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.restore();

    // 绘制文字标签（不应用镜像变换，手动计算镜像坐标）
    for (const face of faces) {
      if (!face.keypoints || face.keypoints.length === 0) continue;

      const xs = face.keypoints.map(kp => kp.x);
      const ys = face.keypoints.map(kp => kp.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);

      const label = STATUS_LABELS[currentStatus] || '';
      if (label) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#00FF00';
        const textWidth = ctx.measureText(label).width;
        const mirroredX = canvas.width - maxX;
        ctx.fillRect(mirroredX, minY - 20, textWidth + 8, 20);
        ctx.fillStyle = '#000000';
        ctx.fillText(label, mirroredX + 4, minY - 6);
      }
    }
  }

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
    if (enabled) loop();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [enabled, detect]);

  return { status, confidence, detector, videoRef, canvasRef, error, isCameraActive, startCamera, stopCamera };
}
