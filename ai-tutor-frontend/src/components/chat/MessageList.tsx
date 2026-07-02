import type { Message } from '@/types';
import MessageBubble from './MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0 : 0.03, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble message={msg} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}