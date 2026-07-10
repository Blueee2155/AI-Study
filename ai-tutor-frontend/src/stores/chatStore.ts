import { create } from 'zustand';
import type { Message, Subject, ChatSession } from '@/types';
import { getSessions } from '@/services/api';

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  currentSubject: Subject;

  setActiveSession: (sessionId: string | null) => void;
  setCurrentSubject: (subject: Subject) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setSessions: (sessions: ChatSession[]) => void;
  removeSession: (sessionId: string) => void;
  loadSessions: () => Promise<void>;
  newSession: (subject: Subject) => string;
}

function generateId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  currentSubject: '数学',

  setCurrentSubject: (currentSubject) => set({ currentSubject }),

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  addMessage: (message) => {
    const { sessions, activeSessionId } = get();
    set({
      sessions: sessions.map(s => {
        if (s.session_id !== activeSessionId) return s;
        // 去重：检查是否已存在相同 role 和 content 的消息
        const isDuplicate = s.messages.some(
          m => m.role === message.role && m.content === message.content
        );
        if (isDuplicate) return s;
        return { ...s, messages: [...s.messages, message] };
      }),
    });
  },

  setMessages: (messages) => {
    const { sessions, activeSessionId } = get();
    set({
      sessions: sessions.map(s =>
        s.session_id === activeSessionId
          ? { ...s, messages }
          : s
      ),
    });
  },

  setSessions: (sessions) => set({ sessions }),

  removeSession: (sessionId) => {
    const { activeSessionId } = get();
    set((state) => ({
      sessions: state.sessions.filter(s => s.session_id !== sessionId),
      activeSessionId: activeSessionId === sessionId ? null : activeSessionId,
    }));
  },

  loadSessions: async () => {
    try {
      const sessions = await getSessions();
      set({ sessions });
    } catch {
      // silent
    }
  },

  newSession: (subject) => {
    const sessionId = generateId();
    const newSession: ChatSession = {
      session_id: sessionId,
      subject: subject as Subject,
      messages: [],
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      activeSessionId: sessionId,
      sessions: [...state.sessions, newSession],
    }));
    return sessionId;
  },
}));