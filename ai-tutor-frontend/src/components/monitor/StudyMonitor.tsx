import { useEffect, useRef, useCallback, useState } from 'react';
import { useFaceDetection, type StudyStatus } from '@/hooks/useFaceDetection';
import { useVoiceReminder } from '@/hooks/useVoiceReminder';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useStudyStore } from '@/stores/studyStore';
import VirtualPet from '@/components/pet/VirtualPet';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Stop, Clock, Eye, ChartLine } from '@phosphor-icons/react';

export default function StudyMonitor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [petMessage, setPetMessage] = useState<string | null>(null);

  const { status } = useFaceDetection(videoRef, cameraReady);
  const { speak } = useVoiceReminder();
  const timer = useStudyTimer();
  const { sessionId, startSession, endSession, logDistraction, setStatus: setStudyStatus } = useStudyStore();

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
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
      setPetMessage('休息时间到！起来活动一下吧');
      setTimeout(() => setPetMessage(null), 8000);
    });
  }, [timer.setOnExpire, speak]);

  // Sync study status with pet messages
  useEffect(() => {
    if (status === 'focused') {
      setPetMessage(null);
    } else if (status === 'distracted') {
      setPetMessage('专心一点哦');
      speak('distracted');
    } else if (status === 'drowsy') {
      setPetMessage('你可不能睡着呀');
    } else if (status === 'away') {
      setPetMessage('你还在吗？');
    }
  }, [status, speak]);

  // Log distraction to backend
  useEffect(() => {
    if (status === 'distracted' && sessionId) {
      logDistraction(sessionId);
    }
  }, [status, sessionId, logDistraction]);

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

      {/* Virtual Pet with glass card */}
      <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-4 shadow-diffusion">
        <VirtualPet
          status={status}
          message={petMessage}
          isTimerExpired={timer.hasExpired}
        />
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
          {status === 'drowsy' && '开小差'}
          {status === 'away' && '离开'}
          {status === 'loading' && '加载模型中...'}
          {status === 'error' && '检测异常'}
        </span>
      </div>

      {/* Camera view */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200/50" style={{ aspectRatio: '4/3' }}>
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <p className="text-xs text-slate-500 text-center px-4">{cameraError}</p>
          </div>
        ) : !cameraReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <Eye size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-xs text-slate-400">点击下方按钮开启摄像头</p>
            </div>
          </div>
        ) : null}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover rounded-2xl ${cameraReady ? '' : 'hidden'}`}
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
          <p className="text-xs text-slate-400 mt-1">25 分钟专注计时</p>
        </div>

        {/* Progress ring indicator */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, ((25 * 60 - (timer.remaining.minutes * 60 + timer.remaining.seconds)) / (25 * 60)) * 100)}%` }}
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
              {Math.round(100 - (Math.min(10, Math.max(0, status === 'distracted' ? 15 : status === 'drowsy' ? 25 : 0))))}%
            </span>
            <span className="text-xs text-slate-400 mb-1">当前</span>
          </div>
        </div>
      </motion.div>

      {/* Rescan button when error */}
      {status === 'error' && (
        <button
          onClick={startCamera}
          className="w-full py-2.5 rounded-2xl text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all"
        >
          重新加载检测模型
        </button>
      )}
    </div>
  );
}
