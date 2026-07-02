import type { StudyStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  status: StudyStatus;
  message: string | null;
  isTimerExpired: boolean;
}

function PetBubble({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-2xl px-4 py-2 shadow-lg border border-slate-200/60 whitespace-nowrap text-sm text-slate-700 font-medium z-10"
    >
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200/60 rotate-45" />
      {message}
    </motion.div>
  );
}

export default function VirtualPet({ status, message, isTimerExpired }: Props) {
  const [mood, setMood] = useState<'happy' | 'neutral' | 'worried' | 'sleepy' | 'celebrate'>('happy');
  const [blink, setBlink] = useState(false);
  const [showZzz, setShowZzz] = useState(false);

  useEffect(() => {
    if (isTimerExpired) {
      setMood('celebrate');
      return;
    }
    switch (status) {
      case 'focused': setMood('happy'); break;
      case 'distracted': setMood('worried'); break;
      case 'drowsy': setMood('sleepy'); break;
      case 'away': setMood('neutral'); break;
      case 'idle': setMood('happy'); break;
      default: setMood('neutral');
    }
  }, [status, isTimerExpired]);

  // Random blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);

  // Zzz animation for sleepy mood
  useEffect(() => {
    if (mood !== 'sleepy') {
      setShowZzz(false);
      return;
    }
    const cycle = setInterval(() => {
      setShowZzz(prev => !prev);
    }, 2500);
    setShowZzz(true);
    return () => clearInterval(cycle);
  }, [mood]);

  const tilt =
    mood === 'happy' ? 0 :
    mood === 'neutral' ? 2 :
    mood === 'worried' ? -4 :
    mood === 'sleepy' ? 6 : 0;
  const scale =
    mood === 'happy' ? 1 :
    mood === 'neutral' ? 0.95 :
    mood === 'worried' ? 0.9 :
    mood === 'sleepy' ? 0.85 : 1.05;

  return (
    <div className="relative flex flex-col items-center py-1">
      <AnimatePresence mode="wait">
        {message && <PetBubble key={message} message={message} />}
      </AnimatePresence>

      <motion.div
        animate={{ rotate: tilt, scale }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="relative w-24 h-28"
      >
        <svg viewBox="0 0 120 140" className="w-full h-full overflow-visible">
          {/* Body glow for focused */}
          {mood === 'happy' && (
            <ellipse cx="60" cy="90" rx="44" ry="38" fill="rgba(16,185,129,0.12)" className="animate-pulse-slow" />
          )}

          {/* Left wing */}
          <motion.ellipse
            cx="18" cy="85" rx="14" ry="22" fill="#6B4E12"
            animate={mood === 'celebrate' ? { rotate: [-20, 20, -20], originX: '150%', originY: '50%' } : {}}
            transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
          />
          {/* Right wing */}
          <motion.ellipse
            cx="102" cy="85" rx="14" ry="22" fill="#6B4E12"
            animate={mood === 'celebrate' ? { rotate: [20, -20, 20], originX: '-50%', originY: '50%' } : {}}
            transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
          />

          {/* Body */}
          <ellipse cx="60" cy="90" rx="38" ry="33" fill="#8B6914" />
          <ellipse cx="60" cy="92" rx="28" ry="24" fill="#D4A843" />

          {/* Ear tufts */}
          <polygon points="38,32 34,22 44,30" fill="#6B4E12" />
          <polygon points="82,32 86,22 76,30" fill="#6B4E12" />

          {/* Head */}
          <circle cx="60" cy="58" r="30" fill="#8B6914" />

          {/* Eyes */}
          {blink || mood === 'sleepy' ? (
            <>
              <line x1="41" y1="55" x2="55" y2="55" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="65" y1="55" x2="79" y2="55" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="48" cy="55" r="10" fill="white" />
              <circle cx="72" cy="55" r="10" fill="white" />
              <circle cx="48" cy="55" r={mood === 'worried' ? 5 : 6} fill="#2C1810" />
              <circle cx="72" cy="55" r={mood === 'worried' ? 5 : 6} fill="#2C1810" />
              <circle cx="50" cy="53" r="2" fill="white" />
              <circle cx="74" cy="53" r="2" fill="white" />
            </>
          )}

          {/* Beak */}
          <polygon points="55,63 65,63 60,71" fill="#F4A460" />

          {/* Feet */}
          <ellipse cx="47" cy="127" rx="8" ry="4" fill="#F4A460" />
          <ellipse cx="73" cy="127" rx="8" ry="4" fill="#F4A460" />

          {/* Zzz animations for sleepy */}
          {showZzz && mood === 'sleepy' && (
            <g>
              <text x="82" y="32" fontSize="11" fill="#94A3B8" fontFamily="Outfit, sans-serif" fontWeight="600">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;4,-8" dur="2.5s" repeatCount="indefinite" />
                z
              </text>
              <text x="90" y="20" fontSize="13" fill="#94A3B8" fontFamily="Outfit, sans-serif" fontWeight="600">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;6,-10" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
                z
              </text>
              <text x="100" y="9" fontSize="15" fill="#94A3B8" fontFamily="Outfit, sans-serif" fontWeight="600">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;8,-12" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
                z
              </text>
            </g>
          )}

          {/* Exclamation when worried */}
          {mood === 'worried' && (
            <text x="86" y="28" fontSize="16" fill="#F59E0B" fontFamily="Outfit, sans-serif" fontWeight="700">
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
              !
            </text>
          )}
        </svg>
      </motion.div>

      {/* Mood indicator */}
      <div className="mt-0.5 flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            mood === 'happy' ? 'bg-emerald-500' :
            mood === 'worried' ? 'bg-amber-500' :
            mood === 'sleepy' ? 'bg-slate-400' :
            mood === 'celebrate' ? 'bg-amber-500 animate-ping' :
            'bg-slate-300'
          }`}
        />
        <span className="text-[10px] font-medium text-slate-400">
          {mood === 'happy' && '状态良好'}
          {mood === 'neutral' && '等待中'}
          {mood === 'worried' && '需要专注'}
          {mood === 'sleepy' && '有点困了'}
          {mood === 'celebrate' && '休息一下'}
        </span>
      </div>
    </div>
  );
}