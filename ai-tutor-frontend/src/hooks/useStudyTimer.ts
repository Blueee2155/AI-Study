import { useEffect, useRef, useCallback, useState } from 'react';
import { useStudyStore } from '../stores/studyStore';

export const POMODORO_MINUTES = 25;
const POMODORO_SECONDS = POMODORO_MINUTES * 60;

export function useStudyTimer() {
  const tick = useStudyStore((s) => s.tick);
  const sessionActive = useStudyStore((s) => s.sessionActive);
  const elapsedSeconds = useStudyStore((s) => s.elapsedSeconds);
  const intervalRef = useRef<number | null>(null);
  const onExpireRef = useRef<(() => void) | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (sessionActive) {
      setIsRunning(true);
      intervalRef.current = window.setInterval(() => {
        tick();
      }, 1000);
    } else {
      setIsRunning(false);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionActive, tick]);

  const totalRemaining = Math.max(0, POMODORO_SECONDS - elapsedSeconds);
  const remaining = {
    minutes: Math.floor(totalRemaining / 60),
    seconds: totalRemaining % 60,
  };
  const hasExpired = elapsedSeconds >= POMODORO_SECONDS && elapsedSeconds > 0;

  const setOnExpire = useCallback((fn: () => void) => {
    onExpireRef.current = fn;
  }, []);

  const start = useCallback(() => {
    useStudyStore.getState().setSessionActive(true);
  }, []);

  const pause = useCallback(() => {
    useStudyStore.getState().setSessionActive(false);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRunning,
    remaining,
    hasExpired,
    formatTime,
    start,
    pause,
    setOnExpire,
  };
}
