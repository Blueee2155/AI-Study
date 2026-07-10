import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { sendMessageStream, getMessages } from '@/services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import type { Message } from '@/types';
import { ArrowCircleDown, ChatTeardropDots, Sparkle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const SUBJECTS = ['政治', '英语', '数学', '专业课'];

const SUBJECT_STYLES: Record<string, string> = {
  '政治': 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  '英语': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  '数学': 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  '专业课': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
};

export default function ChatPanel() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { sessions, activeSessionId, setActiveSession, addMessage, setMessages } = useChatStore();
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('政治');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const session = sessions.find(s => s.session_id === activeSessionId);
  const messages = session?.messages ?? [];

  // Init active session from URL
  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId]);

  // Load messages
  useEffect(() => {
    if (!activeSessionId) return;
    setError(null);
    getMessages(activeSessionId)
      .then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs);
        }
      })
      .catch(() => {
        // 静默处理，不显示错误提示
      });
  }, [activeSessionId, setMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Scroll listener for showScrollBtn
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!isNearBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (content: string) => {
    if (!content.trim() || streaming) return;
    setError(null);

    let sid = activeSessionId;
    if (!sid) {
      sid = useChatStore.getState().newSession(subject as any);
      setActiveSession(sid);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);

    setStreaming(true);
    setStreamingText('');
    let fullText = '';

    try {
      const reader = await sendMessageStream(sid, content.trim(), subject);
      const decoder = new TextDecoder();
      // SSE 行缓冲区：处理 chunk 边界切割 data: 行的情况
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // 将缓冲区中的残留数据与新 chunk 拼接
        const text = sseBuffer + chunk;
        const lines = text.split('\n');

        // 最后一项可能是未完成的行，保留到下次处理
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') {
                fullText += parsed.content;
                setStreamingText(fullText);
              } else if (parsed.type === 'done') {
                break;
              } else if (parsed.type === 'error') {
                setError(parsed.content);
              }
            } catch {
              // JSON 不完整或格式异常，跳过该行（不再累加到 fullText）
              console.warn('[SSE] Failed to parse:', data);
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (sseBuffer.trim().startsWith('data: ')) {
        const data = sseBuffer.trim().slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              fullText += parsed.content;
              setStreamingText(fullText);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e: any) {
      setError(e.message || '消息发送失败，请重试');
    } finally {
      if (fullText) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullText,
          created_at: new Date().toISOString(),
        };
        addMessage(aiMsg);
      }
      setStreaming(false);
      setStreamingText('');
    }
  };

  const isEmpty = messages.length === 0 && !streamingText && !error;

  return (
    <div className="flex flex-col h-full relative">
      {/* Top bar — glass panel */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center ring-1 ring-emerald-200/50">
            <ChatTeardropDots size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">考研问答</h2>
        </div>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className={`text-sm rounded-xl px-3 py-1.5 border font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-no-repeat bg-[length:12px] bg-[right_10px_center] ${SUBJECT_STYLES[subject] || ''}`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, paddingRight: '32px' }}
        >
          {SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Messages area */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center pt-24 pb-16"
            >
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20"
              >
                <Sparkle size={28} weight="fill" className="text-white" />
              </motion.div>
              <h3 className="mt-6 text-xl font-bold text-slate-800 tracking-tight">开始你的提问</h3>
              <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                选择科目后，输入你想要了解的考研知识点或题目， AI 助手将为你提供详细的解答
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {SUBJECTS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      subject === s
                        ? SUBJECT_STYLES[s] + ' ring-1'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          <MessageList
            messages={[
              ...messages,
              ...(streamingText
                ? [{ id: 'streaming', role: 'assistant' as const, content: streamingText, created_at: '' }]
                : []),
            ]}
          />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600"
            >
              {error}
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all z-10"
        >
          <ArrowCircleDown size={20} />
        </motion.button>
      )}

      {/* Input area — glass panel */}
      <div className="border-t border-slate-200/50 bg-white/70 backdrop-blur-md px-6 py-4">
        <MessageInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
