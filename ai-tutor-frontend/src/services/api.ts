import axios from 'axios';
import type { Message } from '@/types';

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('ai-tutor-auth');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch { /* ignore */ }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ai-tutor-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== API functions =====

export async function createSession(subject: string, title?: string) {
  const res = await api.post('/api/chat/sessions', { subject, title });
  return res.data;
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const res = await api.get(`/api/chat/history/${sessionId}`);
  return res.data?.messages || [];
}

export async function getSessions() {
  const res = await api.get('/api/chat/sessions');
  return res.data?.sessions || [];
}

export async function deleteSession(sessionId: string) {
  await api.delete(`/api/chat/history/${sessionId}`);
}

export async function submitStudyReport(data: {
  duration_seconds: number;
  distraction_count: number;
  status: 'completed' | 'interrupted';
}) {
  const res = await api.post('/api/study/reports', data);
  return res.data;
}

export async function startStudySession() {
  const res = await api.post('/api/study/session/start');
  return res.data;
}

export async function endStudySession(sessionId: number) {
  const res = await api.post('/api/study/session/end', { session_id: sessionId });
  return res.data;
}

export async function logStudyDistraction(sessionId: number) {
  const res = await api.post('/api/study/distraction', { session_id: sessionId });
  return res.data;
}

export async function getTodayReport() {
  const res = await api.get('/api/study/report');
  return res.data;
}

export async function sendMessageStream(
  sessionId: string,
  question: string,
  subject: string
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const stored = localStorage.getItem('ai-tutor-auth');
  let token = '';
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      token = state?.token || '';
    } catch { /* ignore */ }
  }

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ question, subject, session_id: sessionId }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || '请求失败');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法获取响应流');
  return reader;
}

export { api };