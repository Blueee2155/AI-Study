import { useEffect, useRef, useCallback, useState } from 'react';
import { useFaceDetection, type StudyStatus } from '@/hooks/useFaceDetection';
import { useVoiceReminder } from '@/hooks/useVoiceReminder';
import { useStudyTimer, POMODORO_MINUTES } from '@/hooks/useStudyTimer';
import { useStudyStore } from '@/stores/studyStore';
import UnicornAvatar, { type UnicornAvatarHandle } from '@/components/common/UnicornAvatar';
import { motion } from 'framer-motion';
import { Play, Stop, Clock, Eye, ChartLine } from '@phosphor-icons/react';

export default function StudyMonitor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const unicornRef = useRef<UnicornAvatarHandle | null>(null);
  const { status, confidence, canvasRef } = useFaceDetection(videoRef, cameraReady);
  const { speak } = useVoiceReminder();
  const lastSpeechTimeRef = useRef<number>(0); // 用于控制语音冷却时间
  const timer = useStudyTimer();
  const { sessionId, startSession, endSession, logDistraction, setStatus: setStudyStatus } = useStudyStore();

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError('无法访问摄像头。请确保已授权摄像头访问权限。');
      setCameraReady(false);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Sync face detection status to study store
  useEffect(() => {
    if (status) {
      setStudyStatus(status);
    }
  }, [status, setStudyStatus]);

  // Sync timer expire with voice
  useEffect(() => {
    timer.setOnExpire(() => {
      speak('break');
    });
  }, [timer.setOnExpire, speak]);

  // Log distraction to backend
  useEffect(() => {
    if (status === 'distracted' && sessionId) {
      logDistraction(sessionId);
    }
  }, [status, sessionId, logDistraction]);

  // 状态变化时触发语音提醒
  useEffect(() => {
    if (!status) return;

    const now = Date.now();
    const cooldown = 30000; // 30秒冷却时间

    if (now - lastSpeechTimeRef.current < cooldown) return;

    // 只在非专注状态时触发语音
    if (status === 'distracted' || status === 'drowsy' || status === 'away') {
      speak(status);
      lastSpeechTimeRef.current = now;
      // 触发独角兽 distressed 动画
      unicornRef.current?.triggerDistressAnimation();
    }
  }, [status, speak]);

  // Start/stop study session
  const handleToggleStudy = async () => {
    if (timer.isRunning) {
      timer.pause();
      stopCamera();
      if (sessionId) {
        await endSession(sessionId);
      }
    } else {
      const id = await startSession();
      timer.start();
      await startCamera();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-breathing" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">学习监控</span>
      </div>

      {/* Unicorn Pet with glass card */}
      <div className="relative rounded-2xl bg-white/80 border border-slate-200/50 p-4 shadow-diffusion" style={{ minHeight: '120px' }}>
        <UnicornAvatar ref={unicornRef} studyStatus={status} isDraggable={false} />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-1">
        <div
          className={`w-2 h-2 rounded-full ${
            status === 'focused' ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/40'
            : status === 'distracted' ? 'bg-amber-500'
            : status === 'drowsy' ? 'bg-red-500 animate-pulse'
            : status === 'away' ? 'bg-slate-400'
            : status === 'error' ? 'bg-red-600'
            : 'bg-slate-300'
          }`}
        />
        <span className="text-xs font-medium text-slate-600">
          {status === 'focused' && '专注'}
          {status === 'distracted' && '分心'}
          {status === 'drowsy' && '疲劳'}
          {status === 'away' && '离开'}
          {status === 'loading' && '加载模型中...'}
          {status === 'error' && '检测异常'}
          {confidence !== null && status !== 'loading' && ` ${Math.round(confidence)}%`}
        </span>
      </div>

      {/* Camera view */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200/50" style={{ aspectRatio: '4/3' }}>
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <p className="text-xs text-slate-500 text-center px-4">{cameraError}</p>
          </div>
        ) : !cameraReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
            <Eye size={32} className="text-slate-300" />
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20"
            >
              打开摄像头
            </button>
          </div>
        ) : (
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-all backdrop-blur-sm"
          >
            关闭摄像头
          </button>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover rounded-2xl ${cameraReady ? '' : 'hidden'}`}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl pointer-events-none"
          style={{ zIndex: 1 }}
        />
      </div>

      {/* Timer display */}
      <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-4 shadow-diffusion">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">番茄计时</span>
        </div>
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-slate-800 tabular-nums">
            {String(timer.remaining.minutes).padStart(2, '0')}:{String(timer.remaining.seconds).padStart(2, '0')}
          </div>
          <p className="text-xs text-slate-400 mt-1">{POMODORO_MINUTES} 分钟专注计时</p>
        </div>

        {/* Progress ring indicator */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, ((POMODORO_MINUTES * 60 - (timer.remaining.minutes * 60 + timer.remaining.seconds)) / (POMODORO_MINUTES * 60)) * 100)}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Start/Stop button */}
      <motion.button
        onClick={handleToggleStudy}
        whileTap={{ scale: 0.97 }}
        className={`w-full py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
          timer.isRunning
            ? 'bg-red-50 text-red-600 border border-red-200/60 hover:bg-red-100 shadow-sm'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20'
        }`}
      >
        {timer.isRunning ? (
          <><Stop size={16} weight="fill" /> 结束学习</>
        ) : (
          <><Play size={16} weight="fill" /> 开始学习</>
        )}
      </motion.button>

      {/* Focus rate */}
      <motion.div
        initial={false}
        animate={{ height: timer.isRunning ? 'auto' : 0, opacity: timer.isRunning ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-4 shadow-diffusion">
          <div className="flex items-center gap-2 mb-2">
            <ChartLine size={14} className="text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">专注度</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              {confidence !== null
                ? `${Math.round(confidence)}%`
                : `${Math.round(100 - (Math.min(10, Math.max(0, status === 'distracted' ? 15 : status === 'drowsy' ? 25 : 0))))}%`
              }
            </span>
            <span className="text-xs text-slate-400 mb-1">当前</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
