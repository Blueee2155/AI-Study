export type Subject = '政治' | '英语' | '数学' | '专业课';

export type StudyStatus = 'focused' | 'distracted' | 'drowsy' | 'away' | 'idle' | 'loading' | 'error';

export interface StudyState {
  status: StudyStatus;
  focusScore: number;
  sessionActive: boolean;
  elapsedSeconds: number;
  distractionCount: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatSession {
  session_id: string;
  title?: string;
  subject: Subject;
  messages: Message[];
  created_at: string;
}

export interface StudySession {
  id: number;
  start_time: string;
  end_time?: string;
  focus_duration_seconds: number;
  distraction_count: number;
}

export interface StudyReport {
  date: string;
  total_focus_minutes: number;
  distraction_count: number;
  sessions: StudySession[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ChatRequest {
  question: string;
  subject: Subject;
  session_id?: string;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content: string;
}