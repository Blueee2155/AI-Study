import { create } from 'zustand';
import type { StudyStatus, StudyReport } from '@/types';
import { startStudySession, endStudySession, logStudyDistraction, getTodayReport } from '@/services/api';

interface StudyStore {
  status: StudyStatus;
  focusScore: number;
  sessionActive: boolean;
  elapsedSeconds: number;
  distractionCount: number;
  showReminder: boolean;
  petMood: 'happy' | 'neutral' | 'worried' | 'sleepy' | 'celebrate';
  sessionId: number | null;
  report: StudyReport | null;

  setStatus: (status: StudyStatus) => void;
  setFocusScore: (score: number) => void;
  setSessionActive: (active: boolean) => void;
  tick: () => void;
  incrementDistraction: () => void;
  setShowReminder: (show: boolean) => void;
  resetSession: () => void;
  startSession: () => Promise<number>;
  endSession: (sessionId: number) => Promise<void>;
  logDistraction: (sessionId: number) => Promise<void>;
  loadReport: () => Promise<void>;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  status: 'idle',
  focusScore: 100,
  sessionActive: false,
  elapsedSeconds: 0,
  distractionCount: 0,
  showReminder: false,
  petMood: 'happy',
  sessionId: null,
  report: null,

  setStatus: (status) => {
    const petMoodMap: Record<StudyStatus, StudyStore['petMood']> = {
      focused: 'happy',
      distracted: 'worried',
      drowsy: 'sleepy',
      away: 'neutral',
      idle: 'neutral',
      loading: 'neutral',
      error: 'worried',
    };
    set({ status, petMood: petMoodMap[status] });
  },

  setFocusScore: (focusScore) => set({ focusScore }),

  setSessionActive: (sessionActive) => {
    if (sessionActive) {
      set({ sessionActive: true, elapsedSeconds: 0, distractionCount: 0, status: 'focused', focusScore: 100 });
    } else {
      set({ sessionActive: false });
    }
  },

  tick: () => {
    const { sessionActive, elapsedSeconds } = get();
    if (!sessionActive) return;
    const newElapsed = elapsedSeconds + 1;
    set({ elapsedSeconds: newElapsed });

    if (newElapsed > 0 && newElapsed % 1500 === 0) {
      set({ showReminder: true, petMood: 'celebrate' });
    }
  },

  incrementDistraction: () => {
    set((state) => ({ distractionCount: state.distractionCount + 1 }));
  },

  setShowReminder: (showReminder) => {
    if (!showReminder) {
      set({ showReminder: false, petMood: 'happy' });
    } else {
      set({ showReminder });
    }
  },

  startSession: async () => {
    const data = await startStudySession();
    const id = data.id;
    set({ sessionId: id });
    return id;
  },

  endSession: async (sessionId: number) => {
    try {
      await endStudySession(sessionId);
    } catch {
      // silent
    }
    set({ sessionId: null });
    get().loadReport();
  },

  logDistraction: async (sessionId: number) => {
    try {
      await logStudyDistraction(sessionId);
    } catch {
      // silent
    }
  },

  loadReport: async () => {
    try {
      const data = await getTodayReport();
      set({ report: data as StudyReport });
    } catch {
      // silent
    }
  },

  resetSession: () => {
    set({
      status: 'idle',
      focusScore: 100,
      sessionActive: false,
      elapsedSeconds: 0,
      distractionCount: 0,
      showReminder: false,
      petMood: 'happy',
      sessionId: null,
    });
  },
}));