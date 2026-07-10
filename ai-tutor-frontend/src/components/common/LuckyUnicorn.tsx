import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyStore } from '@/stores/studyStore';
import { useVoiceReminder } from '@/hooks/useVoiceReminder';
import type { StudyStatus } from '@/types';

interface LuckyUnicornProps {
  studyStatus?: StudyStatus;
}

export default function LuckyUnicorn({ studyStatus }: LuckyUnicornProps) {
  const storeStatus = useStudyStore((s) => s.status);
  const status = studyStatus ?? storeStatus;
  const { speak } = useVoiceReminder();

  // 位置状态 - 从 localStorage 懒加载
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('luckyUnicornPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return { x: window.innerWidth - 120, y: window.innerHeight - 150 };
  });

  const [dragging, setDragging] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // 状态跟踪 refs - 用于自动语音提醒
  const lastStatusRef = useRef<string>('');
  const lastReminderTimeRef = useRef<number>(0);

  // 拖拽处理 - 使用 Pointer Events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      hasDragged.current = false;
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      hasDragged.current = true;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const clampedX = Math.max(0, Math.min(window.innerWidth - 80, newX));
      const clampedY = Math.max(0, Math.min(window.innerHeight - 90, newY));
      setPos({ x: clampedX, y: clampedY });
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    localStorage.setItem('luckyUnicornPosition', JSON.stringify(pos));
  }, [pos]);

  // 点击处理
  const handleClick = useCallback(() => {
    if (hasDragged.current) return;
    setClicked(true);
    setShowBubble(true);
    setTimeout(() => setClicked(false), 600);
    setTimeout(() => setShowBubble(false), 3000);
    // 语音提醒
    try {
      speak(status);
    } catch {
      /* ignore */
    }
  }, [status, speak]);

  // 监听学习状态变化，自动触发语音提醒
  useEffect(() => {
    // 首次加载不提醒
    if (!lastStatusRef.current) {
      lastStatusRef.current = status;
      return;
    }

    // 如果状态没变化，不提醒
    if (lastStatusRef.current === status) return;

    const now = Date.now();
    // 30秒内同一状态不重复提醒（防抖机制）
    if (now - lastReminderTimeRef.current < 30000 && lastStatusRef.current === status) return;

    // 延迟2秒后提醒（给用户适应时间）
    const timer = setTimeout(() => {
      try {
        speak(status); // 调用 useVoiceReminder hook
        setShowBubble(true); // 显示气泡
        setTimeout(() => setShowBubble(false), 3000);
        lastStatusRef.current = status;
        lastReminderTimeRef.current = Date.now();
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, speak]);

  // 根据状态获取表情配置
  const getMoodConfig = () => {
    switch (status) {
      case 'focused':
        return { eyeType: 'happy', blush: true };
      case 'distracted':
        return { eyeType: 'confused', blush: false };
      case 'drowsy':
        return { eyeType: 'sleepy', blush: false };
      case 'away':
        return { eyeType: 'sleeping', blush: false };
      default:
        return { eyeType: 'happy', blush: true };
    }
  };

  const mood = getMoodConfig();

  // 气泡消息
  const getBubbleMessage = () => {
    switch (status) {
      case 'distracted':
        return '集中注意力哦~ 🎯';
      case 'drowsy':
        return '打起精神来~ 💪';
      case 'away':
        return '记得回来学习哦~ 🌈';
      case 'focused':
        return '继续加油~ ✨';
      default:
        return '';
    }
  };

  return createPortal(
    <>
      {/* 语音气泡 */}
      <AnimatePresence>
        {showBubble && getBubbleMessage() && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            style={{
              position: 'fixed',
              left: pos.x - 20,
              top: pos.y - 45,
              background: 'white',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '13px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              zIndex: 10000,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {getBubbleMessage()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 独角兽主体 */}
      <motion.div
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          width: 70,
          height: 80,
        }}
        animate={
          clicked
            ? { y: -30, rotate: 360, scale: 1.2 }
            : hovered
              ? { scale: 1.1 }
              : { y: [0, -8, 0], rotate: [0, 2, -2, 0] }
        }
        transition={
          clicked
            ? { type: 'spring', stiffness: 400, damping: 15 }
            : hovered
              ? { type: 'spring', stiffness: 300, damping: 20 }
              : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <svg
          width="70"
          height="80"
          viewBox="0 0 70 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        >
          <defs>
            <linearGradient
              id="hornGold"
              x1="35"
              y1="0"
              x2="35"
              y2="25"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
            <filter id="hornGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient
              id="bodyGrad"
              x1="35"
              y1="20"
              x2="35"
              y2="70"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#b07cc6" />
              <stop offset="100%" stopColor="#8e44ad" />
            </linearGradient>
          </defs>

          {/* 独角 */}
          <polygon points="35,2 30,22 40,22" fill="url(#hornGold)" filter="url(#hornGlow)" />
          <line x1="33" y1="8" x2="37" y2="8" stroke="#FFA500" strokeWidth="0.8" />
          <line x1="32" y1="13" x2="38" y2="13" stroke="#FFA500" strokeWidth="0.8" />
          <line x1="31" y1="18" x2="39" y2="18" stroke="#FFA500" strokeWidth="0.8" />

          {/* 头部 */}
          <ellipse cx="35" cy="35" rx="20" ry="18" fill="url(#bodyGrad)" />

          {/* 鬃毛 */}
          <path d="M18,25 Q12,20 15,30 Q10,28 14,35 Q8,35 13,40" fill="#e91e8a" opacity="0.8" />
          <path d="M52,25 Q58,20 55,30 Q60,28 56,35 Q62,35 57,40" fill="#e91e8a" opacity="0.8" />
          <path d="M25,20 Q28,12 35,18 Q32,10 38,16 Q42,10 45,20" fill="#e91e8a" opacity="0.7" />

          {/* 眼睛 - 根据状态变化 */}
          {mood.eyeType === 'happy' && (
            <>
              <ellipse cx="28" cy="34" rx="4" ry="4.5" fill="white" />
              <ellipse cx="42" cy="34" rx="4" ry="4.5" fill="white" />
              <ellipse cx="29" cy="34" rx="2.5" ry="3" fill="#2c3e50" />
              <ellipse cx="43" cy="34" rx="2.5" ry="3" fill="#2c3e50" />
              <circle cx="30" cy="33" r="1" fill="white" />
              <circle cx="44" cy="33" r="1" fill="white" />
            </>
          )}
          {mood.eyeType === 'confused' && (
            <>
              <ellipse cx="28" cy="34" rx="4" ry="3.5" fill="white" />
              <ellipse cx="42" cy="34" rx="4" ry="4.5" fill="white" />
              <ellipse cx="28" cy="35" rx="2.5" ry="2.5" fill="#2c3e50" />
              <ellipse cx="43" cy="34" rx="2.5" ry="3" fill="#2c3e50" />
              <line x1="24" y1="28" x2="32" y2="30" stroke="#2c3e50" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="38" y1="29" x2="46" y2="27" stroke="#2c3e50" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
          {mood.eyeType === 'sleepy' && (
            <>
              <path d="M24,34 Q28,37 32,34" stroke="#2c3e50" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M38,34 Q42,37 46,34" stroke="#2c3e50" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}
          {mood.eyeType === 'sleeping' && (
            <>
              <path d="M24,34 Q28,31 32,34" stroke="#2c3e50" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M38,34 Q42,31 46,34" stroke="#2c3e50" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="50" y="25" fontSize="8" fill="#95a5a6" fontWeight="bold">Z</text>
              <text x="55" y="18" fontSize="6" fill="#95a5a6" fontWeight="bold">z</text>
              <text x="58" y="13" fontSize="5" fill="#95a5a6" fontWeight="bold">z</text>
            </>
          )}

          {/* 腮红 */}
          {mood.blush && (
            <>
              <ellipse cx="22" cy="39" rx="3" ry="2" fill="#ff9ff3" opacity="0.5" />
              <ellipse cx="48" cy="39" rx="3" ry="2" fill="#ff9ff3" opacity="0.5" />
            </>
          )}

          {/* 嘴巴 */}
          {mood.eyeType === 'happy' && (
            <path d="M31,42 Q35,46 39,42" stroke="#2c3e50" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          )}
          {mood.eyeType !== 'happy' && mood.eyeType !== 'sleeping' && (
            <ellipse cx="35" cy="43" rx="2" ry="1.5" fill="#2c3e50" opacity="0.5" />
          )}
          {mood.eyeType === 'sleeping' && (
            <path d="M32,43 Q35,41 38,43" stroke="#2c3e50" strokeWidth="1" fill="none" strokeLinecap="round" />
          )}

          {/* 身体 */}
          <ellipse cx="35" cy="58" rx="18" ry="14" fill="url(#bodyGrad)" />

          {/* 前腿 */}
          <rect x="24" y="66" width="6" height="12" rx="3" fill="#8e44ad" />
          <rect x="40" y="66" width="6" height="12" rx="3" fill="#8e44ad" />
          <ellipse cx="27" cy="77" rx="4" ry="2" fill="#6c3483" />
          <ellipse cx="43" cy="77" rx="4" ry="2" fill="#6c3483" />

          {/* 尾巴 */}
          <path
            d="M53,55 Q62,50 60,58 Q65,55 62,63 Q68,62 63,68"
            stroke="#e91e8a"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* 星星装饰 */}
          <text x="8" y="15" fontSize="6" opacity="0.6">✨</text>
          <text x="55" y="45" fontSize="5" opacity="0.4">⭐</text>
        </svg>
      </motion.div>
    </>,
    document.body,
  );
}
