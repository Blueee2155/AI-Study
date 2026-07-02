import { useState, useRef, useEffect } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2.5 items-end">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的考研问题，Enter 发送，Shift+Enter 换行..."
        rows={1}
        maxLength={2000}
        disabled={disabled}
        className="flex-1 resize-none border border-slate-200/70 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="px-4 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.97]"
      >
        <PaperPlaneTilt size={16} weight="fill" />
        <span className="hidden sm:inline">{disabled ? '思考中' : '发送'}</span>
      </button>
    </div>
  );
}