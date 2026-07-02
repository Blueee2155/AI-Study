import type { Message } from '@/types';
import { marked } from 'marked';
import { useMemo } from 'react';
import { Sparkle, User } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.id === 'streaming';

  const htmlContent = useMemo(() => {
    if (isUser) return null;
    return message.content ? (marked.parse(message.content) as string) : '';
  }, [message.content, isUser]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-amber-300/30">
          <Sparkle size={15} weight="fill" className="text-amber-600" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-600 text-white rounded-tr-md shadow-sm shadow-emerald-600/10'
            : 'bg-white border border-slate-200/60 rounded-tl-md shadow-sm'
        } ${isStreaming ? 'border-emerald-200/40' : ''}`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div
            className={`text-sm leading-relaxed markdown-content ${isStreaming ? 'after:content-[\"▊\"] after:ml-0.5 after:text-emerald-500 after:animate-pulse' : ''}`}
            dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
          />
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-emerald-200/50">
          <User size={15} weight="fill" className="text-emerald-600" />
        </div>
      )}
    </motion.div>
  );
}