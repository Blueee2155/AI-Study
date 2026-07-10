import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { getSessions, deleteSession } from '@/services/api';
import { Plus, ChatCircleDots, Trash, Sparkle, SignOut, Book, MathOperations, Translate, Globe } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const SUBJECT_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  '政治': { icon: <Globe size={16} weight="fill" />, color: 'text-rose-600 bg-rose-50' },
  '英语': { icon: <Translate size={16} weight="fill" />, color: 'text-blue-600 bg-blue-50' },
  '数学': { icon: <MathOperations size={16} weight="fill" />, color: 'text-violet-600 bg-violet-50' },
  '专业课': { icon: <Book size={16} weight="fill" />, color: 'text-amber-600 bg-amber-50' },
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessions, activeSessionId, setActiveSession, setSessions, removeSession, loadSessions } = useChatStore();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSessions();
  }, [loadSessions]);

  const handleNewChat = () => {
    setActiveSession(null);
    navigate('/');
  };

  const handleSelect = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setIsDeleting(sessionId);
    try {
      await deleteSession(sessionId);
      removeSession(sessionId);
      if (activeSessionId === sessionId) {
        navigate('/');
      }
    } catch {
      // silent
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLogout = () => {
    useChatStore.getState().setSessions([]);
    useChatStore.getState().setActiveSession(null);
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-600/20"
          >
            <Sparkle size={17} weight="fill" className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">OwlStudy</h1>
            <p className="text-[11px] text-slate-400 tracking-wide">AI 考研助手</p>
          </div>
        </div>

        <motion.button
          onClick={handleNewChat}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
        >
          <Plus size={16} weight="bold" />
          新建对话
        </motion.button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <ChatCircleDots size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">暂无对话记录</p>
            <p className="text-xs text-slate-300 mt-1">创建一个新对话开始学习</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {sessions.map((s, i) => {
              const cfg = SUBJECT_CONFIG[s.subject] ?? { icon: <ChatCircleDots size={16} />, color: 'text-slate-600 bg-slate-50' };
              const isActive = activeSessionId === s.session_id;
              return (
                <motion.div
                  key={s.session_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25, delay: mounted ? i * 0.03 : 0, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handleSelect(s.session_id)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
                      {s.title || (s.messages?.[0]?.content?.slice(0, 22) + '...') || '新对话'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.subject}</p>
                  </div>
                  <motion.button
                    onClick={e => handleDelete(e, s.session_id)}
                    whileTap={{ scale: 0.9 }}
                    disabled={isDeleting === s.session_id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="删除对话"
                  >
                    <Trash size={14} />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom: logout */}
      <div className="p-3 border-t border-slate-100">
        <motion.button
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
        >
          <SignOut size={15} />
          退出登录
        </motion.button>
      </div>
    </div>
  );
}