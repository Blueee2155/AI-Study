import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudyStatus } from '@/types';

interface UnicornAvatarProps {
  studyStatus: StudyStatus;
  isDraggable?: boolean; // 是否可拖动，默认true
}

// Map StudyStatus to unicorn mood
type UnicornMood = 'focused' | 'distracted' | 'absent-minded' | 'away';

function getMood(status: StudyStatus): UnicornMood {
  switch (status) {
    case 'focused': return 'focused';
    case 'distracted': return 'distracted';
    case 'drowsy': return 'absent-minded';
    case 'away': return 'away';
    default: return 'focused';
  }
}

const moodLabels: Record<UnicornMood, string> = {
  focused: '专注中 ✨',
  distracted: '有点分心哦',
  'absent-minded': '要注意力集中呀',
  away: '休息一下~',
};

export interface UnicornAvatarHandle {
  triggerDistressAnimation: () => void;
}

const UnicornAvatar = forwardRef<UnicornAvatarHandle, UnicornAvatarProps>(
  function UnicornAvatar({ studyStatus, isDraggable = true }: UnicornAvatarProps, ref) {
  const mood = getMood(studyStatus);
  // Lazy initialization to read from localStorage on first render
  const [pos, setPos] = useState(() => {
    const savedKey = isDraggable ? 'unicornPosition' : 'unicornPanelPosition';
    const saved = localStorage.getItem(savedKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { x: parsed.x, y: parsed.y };
      } catch { /* ignore */ }
    }

    // Default position
    if (!isDraggable) {
      // Panel center: parent ~300px wide x 120px high, unicorn 80px x 90px
      return { x: 110, y: 15 };
    } else {
      // Bottom-right corner for draggable mode
      return { x: window.innerWidth - 100, y: window.innerHeight - 140 };
    }
  });
  const [dragging, setDragging] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [distressed, setDistressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Expose triggerDistressAnimation to parent via ref
  useImperativeHandle(ref, () => ({
    triggerDistressAnimation: () => {
      setDistressed(true);
      setTimeout(() => setDistressed(false), 1200);
    },
  }));

  // Save position to localStorage
  const savePosition = useCallback((x: number, y: number) => {
    const key = isDraggable ? 'unicornPosition' : 'unicornPanelPosition';
    localStorage.setItem(key, JSON.stringify({ x, y }));
  }, [isDraggable]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Calculate new position relative to viewport
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // For non-draggable mode (panel), save position relative to the parent container
    if (!isDraggable && dragRef.current?.parentElement) {
      const parentRect = dragRef.current.parentElement.getBoundingClientRect();
      const relativeX = newX - parentRect.left;
      const relativeY = newY - parentRect.top;
      savePosition(relativeX, relativeY);
    } else {
      // For draggable mode, save absolute viewport coordinates
      savePosition(newX, newY);
    }
  }, [dragging, savePosition, isDraggable]);

  // Click: jump/spin animation
  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 600);
  }, []);

  // Position is always valid thanks to lazy initializer

  // When not draggable, render with absolute positioning inside parent container
  if (!isDraggable) {
    return (
      <div
        ref={dragRef}
        className="unicorn-container opacity-1"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: '80px',
          height: '90px',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setClicked(false); }}
      >
        {/* Speech bubble */}
        <AnimatePresence>
          {(mood === 'distracted' || mood === 'absent-minded') && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.8 }}
              className="unicorn-bubble"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
            >
              {moodLabels[mood]}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unicorn SVG - same structure as draggable version */}
        <motion.div
          className={`unicorn-body unicorn-mood-${mood}`}
          animate={
            distressed
              ? { x: [0, -6, 6, -6, 6, 0], rotate: [0, -5, 5, -5, 5, 0] }
              : clicked
                ? { y: -20, rotate: 360, scale: 1.1 }
                : hovered
                  ? { scale: 1.05 }
                  : { y: 0, rotate: 0, scale: 1 }
          }
          transition={
            distressed
              ? { duration: 0.6, ease: 'easeInOut' }
              : clicked
              ? { type: 'spring', stiffness: 300, damping: 10, duration: 0.6 }
              : { type: 'spring', stiffness: 200, damping: 20 }
          }
        >
          <svg viewBox="0 0 120 140" width="80" height="90" className="overflow-visible">
            {/* Glow effect for focused */}
            {mood === 'focused' && (
              <ellipse cx="60" cy="85" rx="50" ry="45" className="unicorn-glow" />
            )}

            {/* Tail */}
            <motion.path
              d={mood === 'focused'
                ? "M15,95 Q0,80 5,65 Q8,55 15,60"
                : "M15,95 Q-2,85 3,70 Q6,58 15,62"
              }
              stroke="url(#tailGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              animate={hovered ? {
                d: [
                  "M15,95 Q0,80 5,65 Q8,55 15,60",
                  "M15,95 Q-5,78 2,62 Q7,52 15,58",
                  "M15,95 Q0,80 5,65 Q8,55 15,60",
                ]
              } : {}}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
            />

            {/* Body */}
            <ellipse cx="60" cy="90" rx="32" ry="28" fill="#F0E6FF" />
            <ellipse cx="60" cy="93" rx="24" ry="20" fill="#FAF5FF" />

            {/* Legs */}
            <rect x="40" y="112" width="8" height="18" rx="4" fill="#E9D5FF" />
            <rect x="55" y="114" width="8" height="16" rx="4" fill="#E9D5FF" />
            <rect x="70" y="112" width="8" height="18" rx="4" fill="#E9D5FF" />
            {/* Hooves */}
            <ellipse cx="44" cy="130" rx="5" ry="3" fill="#C084FC" />
            <ellipse cx="59" cy="130" rx="5" ry="3" fill="#C084FC" />
            <ellipse cx="74" cy="130" rx="5" ry="3" fill="#C084FC" />

            {/* Neck */}
            <ellipse cx="60" cy="65" rx="16" ry="14" fill="#F0E6FF" />

            {/* Head */}
            <ellipse cx="60" cy="45" rx="22" ry="20" fill="#F0E6FF" />

            {/* Ear */}
            <polygon points="42,30 38,12 50,28" fill="#E9D5FF" />
            <polygon points="44,28 40,16 49,27" fill="#FCE7F3" />

            {/* Horn */}
            <motion.polygon
              points="58,26 62,26 60,4"
              fill="url(#hornGradient)"
              animate={mood === 'focused' ? {
                filter: ['drop-shadow(0 0 2px rgba(250,204,21,0.4))', 'drop-shadow(0 0 8px rgba(250,204,21,0.8))', 'drop-shadow(0 0 2px rgba(250,204,21,0.4))']
              } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
            {/* Horn spiral lines */}
            <line x1="59" y1="22" x2="61" y2="22" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />
            <line x1="59" y1="17" x2="61" y2="17" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />
            <line x1="59.5" y1="12" x2="60.5" y2="12" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />

            {/* Mane */}
            <path d="M44,30 Q35,35 38,45 Q34,50 38,55 Q35,60 40,62" stroke="url(#maneGradient)" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* Eyes - different per mood */}
            {mood === 'away' ? (
              /* Sleeping: closed eyes */
              <>
                <path d="M48,42 Q52,45 56,42" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M64,42 Q68,45 72,42" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            ) : mood === 'distracted' ? (
              /* Confused: spiral eyes */
              <>
                <circle cx="52" cy="43" r="6" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="68" cy="43" r="6" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="52" cy="43" r="3" fill="#7C3AED" />
                <circle cx="68" cy="43" r="3" fill="#7C3AED" />
                {/* Question marks */}
                <text x="76" y="30" fontSize="12" fill="#F59E0B" fontWeight="700">?</text>
              </>
            ) : mood === 'absent-minded' ? (
              /* Worried: wide eyes with small pupils */
              <>
                <circle cx="52" cy="43" r="7" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="68" cy="43" r="7" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="52" cy="44" r="2.5" fill="#7C3AED" />
                <circle cx="68" cy="44" r="2.5" fill="#7C3AED" />
                {/* Sweat drop */}
                <motion.ellipse
                  cx="78" cy="36" rx="2" ry="3" fill="#93C5FD"
                  animate={{ y: [0, 3, 0], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              </>
            ) : (
              /* Focused: happy sparkly eyes */
              <>
                <circle cx="52" cy="43" r="6" fill="white" />
                <circle cx="68" cy="43" r="6" fill="white" />
                <circle cx="52" cy="43" r="4" fill="#7C3AED" />
                <circle cx="68" cy="43" r="4" fill="#7C3AED" />
                <circle cx="54" cy="41" r="1.5" fill="white" />
                <circle cx="70" cy="41" r="1.5" fill="white" />
                {/* Sparkle */}
                {hovered && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <text x="76" y="36" fontSize="8" fill="#FBBF24"></text>
                  </motion.g>
                )}
              </>
            )}

            {/* Blush */}
            <ellipse cx="44" cy="50" rx="4" ry="2.5" fill="rgba(251,113,133,0.3)" />
            <ellipse cx="76" cy="50" rx="4" ry="2.5" fill="rgba(251,113,133,0.3)" />

            {/* Mouth */}
            {mood === 'focused' ? (
              <path d="M55,54 Q60,59 65,54" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            ) : mood === 'distracted' ? (
              <path d="M55,56 Q60,53 65,56" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            ) : mood === 'absent-minded' ? (
              <ellipse cx="60" cy="55" rx="3" ry="2" fill="#7C3AED" opacity="0.6" />
            ) : (
              /* away: sleeping mouth */
              <path d="M56,55 L64,55" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
            )}

            {/* ZZZ for away */}
            {mood === 'away' && (
              <g>
                <text x="78" y="28" fontSize="10" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="translate" values="0,0;5,-10" dur="2s" repeatCount="indefinite" />
                  Z
                </text>
                <text x="86" y="18" fontSize="12" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="translate" values="0,0;6,-12" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  Z
                </text>
                <text x="95" y="8" fontSize="14" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="translate" values="0,0;8,-14" dur="2s" begin="1s" repeatCount="indefinite" />
                  Z
                </text>
              </g>
            )}

            {/* Wave hand for absent-minded */}
            {mood === 'absent-minded' && (
              <motion.g
                animate={{ rotate: [-15, 15, -15] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                style={{ transformOrigin: '85px 85px' }}
              >
                <rect x="82" y="72" width="6" height="16" rx="3" fill="#E9D5FF" />
                <circle cx="85" cy="70" r="4" fill="#E9D5FF" />
              </motion.g>
            )}

            {/* Gradients */}
            <defs>
              <linearGradient id="hornGradient" x1="60" y1="4" x2="60" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="tailGradient" x1="0" y1="60" x2="15" y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="50%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
              <linearGradient id="maneGradient" x1="35" y1="30" x2="40" y2="62" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="50%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Mood label */}
        <div className="unicorn-label" style={{ textAlign: 'center' }}>
          {moodLabels[mood]}
        </div>
      </div>
    );
  }

  // When draggable, use portal to render at body level
  return createPortal(
    <div
      ref={dragRef}
      className="unicorn-container"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setClicked(false); }}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {(mood === 'distracted' || mood === 'absent-minded') && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
            className="unicorn-bubble"
          >
            {moodLabels[mood]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unicorn SVG - identical to non-draggable version above */}
      <motion.div
        className={`unicorn-body unicorn-mood-${mood}`}
        animate={
          distressed
            ? { x: [0, -6, 6, -6, 6, 0], rotate: [0, -5, 5, -5, 5, 0] }
            : clicked
              ? { y: -20, rotate: 360, scale: 1.1 }
              : hovered
                ? { scale: 1.05 }
                : { y: 0, rotate: 0, scale: 1 }
        }
        transition={
          distressed
            ? { duration: 0.6, ease: 'easeInOut' }
            : clicked
            ? { type: 'spring', stiffness: 300, damping: 10, duration: 0.6 }
            : { type: 'spring', stiffness: 200, damping: 20 }
        }
      >
        <svg viewBox="0 0 120 140" width="80" height="90" className="overflow-visible">
          {/* Glow effect for focused */}
          {mood === 'focused' && (
            <ellipse cx="60" cy="85" rx="50" ry="45" className="unicorn-glow" />
          )}

          {/* Tail */}
          <motion.path
            d={mood === 'focused'
              ? "M15,95 Q0,80 5,65 Q8,55 15,60"
              : "M15,95 Q-2,85 3,70 Q6,58 15,62"
            }
            stroke="url(#tailGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            animate={hovered ? {
              d: [
                "M15,95 Q0,80 5,65 Q8,55 15,60",
                "M15,95 Q-5,78 2,62 Q7,52 15,58",
                "M15,95 Q0,80 5,65 Q8,55 15,60",
              ]
            } : {}}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
          />

          {/* Body */}
          <ellipse cx="60" cy="90" rx="32" ry="28" fill="#F0E6FF" />
          <ellipse cx="60" cy="93" rx="24" ry="20" fill="#FAF5FF" />

          {/* Legs */}
          <rect x="40" y="112" width="8" height="18" rx="4" fill="#E9D5FF" />
          <rect x="55" y="114" width="8" height="16" rx="4" fill="#E9D5FF" />
          <rect x="70" y="112" width="8" height="18" rx="4" fill="#E9D5FF" />
          {/* Hooves */}
          <ellipse cx="44" cy="130" rx="5" ry="3" fill="#C084FC" />
          <ellipse cx="59" cy="130" rx="5" ry="3" fill="#C084FC" />
          <ellipse cx="74" cy="130" rx="5" ry="3" fill="#C084FC" />

          {/* Neck */}
          <ellipse cx="60" cy="65" rx="16" ry="14" fill="#F0E6FF" />

          {/* Head */}
          <ellipse cx="60" cy="45" rx="22" ry="20" fill="#F0E6FF" />

          {/* Ear */}
          <polygon points="42,30 38,12 50,28" fill="#E9D5FF" />
          <polygon points="44,28 40,16 49,27" fill="#FCE7F3" />

          {/* Horn */}
          <motion.polygon
            points="58,26 62,26 60,4"
            fill="url(#hornGradient)"
            animate={mood === 'focused' ? {
              filter: ['drop-shadow(0 0 2px rgba(250,204,21,0.4))', 'drop-shadow(0 0 8px rgba(250,204,21,0.8))', 'drop-shadow(0 0 2px rgba(250,204,21,0.4))']
            } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
          {/* Horn spiral lines */}
          <line x1="59" y1="22" x2="61" y2="22" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />
          <line x1="59" y1="17" x2="61" y2="17" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />
          <line x1="59.5" y1="12" x2="60.5" y2="12" stroke="rgba(250,204,21,0.5)" strokeWidth="0.8" />

          {/* Mane */}
          <path d="M44,30 Q35,35 38,45 Q34,50 38,55 Q35,60 40,62" stroke="url(#maneGradient)" strokeWidth="4" fill="none" strokeLinecap="round" />

          {/* Eyes - different per mood */}
          {mood === 'away' ? (
            /* Sleeping: closed eyes */
            <>
              <path d="M48,42 Q52,45 56,42" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M64,42 Q68,45 72,42" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          ) : mood === 'distracted' ? (
            /* Confused: spiral eyes */
            <>
              <circle cx="52" cy="43" r="6" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
              <circle cx="68" cy="43" r="6" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
              <circle cx="52" cy="43" r="3" fill="#7C3AED" />
              <circle cx="68" cy="43" r="3" fill="#7C3AED" />
              {/* Question marks */}
              <text x="76" y="30" fontSize="12" fill="#F59E0B" fontWeight="700">?</text>
            </>
          ) : mood === 'absent-minded' ? (
            /* Worried: wide eyes with small pupils */
            <>
              <circle cx="52" cy="43" r="7" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
              <circle cx="68" cy="43" r="7" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
              <circle cx="52" cy="44" r="2.5" fill="#7C3AED" />
              <circle cx="68" cy="44" r="2.5" fill="#7C3AED" />
              {/* Sweat drop */}
              <motion.ellipse
                cx="78" cy="36" rx="2" ry="3" fill="#93C5FD"
                animate={{ y: [0, 3, 0], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </>
          ) : (
            /* Focused: happy sparkly eyes */
            <>
              <circle cx="52" cy="43" r="6" fill="white" />
              <circle cx="68" cy="43" r="6" fill="white" />
              <circle cx="52" cy="43" r="4" fill="#7C3AED" />
              <circle cx="68" cy="43" r="4" fill="#7C3AED" />
              <circle cx="54" cy="41" r="1.5" fill="white" />
              <circle cx="70" cy="41" r="1.5" fill="white" />
              {/* Sparkle */}
              {hovered && (
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <text x="76" y="36" fontSize="8" fill="#FBBF24">✦</text>
                </motion.g>
              )}
            </>
          )}

          {/* Blush */}
          <ellipse cx="44" cy="50" rx="4" ry="2.5" fill="rgba(251,113,133,0.3)" />
          <ellipse cx="76" cy="50" rx="4" ry="2.5" fill="rgba(251,113,133,0.3)" />

          {/* Mouth */}
          {mood === 'focused' ? (
            <path d="M55,54 Q60,59 65,54" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : mood === 'distracted' ? (
            <path d="M55,56 Q60,53 65,56" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : mood === 'absent-minded' ? (
            <ellipse cx="60" cy="55" rx="3" ry="2" fill="#7C3AED" opacity="0.6" />
          ) : (
            /* away: sleeping mouth */
            <path d="M56,55 L64,55" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          )}

          {/* ZZZ for away */}
          {mood === 'away' && (
            <g>
              <text x="78" y="28" fontSize="10" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;5,-10" dur="2s" repeatCount="indefinite" />
                Z
              </text>
              <text x="86" y="18" fontSize="12" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;6,-12" dur="2s" begin="0.5s" repeatCount="indefinite" />
                Z
              </text>
              <text x="95" y="8" fontSize="14" fill="#94A3B8" fontWeight="600" fontFamily="Outfit, sans-serif">
                <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0;8,-14" dur="2s" begin="1s" repeatCount="indefinite" />
                Z
              </text>
            </g>
          )}

          {/* Wave hand for absent-minded */}
          {mood === 'absent-minded' && (
            <motion.g
              animate={{ rotate: [-15, 15, -15] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
              style={{ transformOrigin: '85px 85px' }}
            >
              <rect x="82" y="72" width="6" height="16" rx="3" fill="#E9D5FF" />
              <circle cx="85" cy="70" r="4" fill="#E9D5FF" />
            </motion.g>
          )}

          {/* Gradients */}
          <defs>
            <linearGradient id="hornGradient" x1="60" y1="4" x2="60" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="tailGradient" x1="0" y1="60" x2="15" y2="95" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="maneGradient" x1="35" y1="30" x2="40" y2="62" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="50%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Mood label */}
      <div className="unicorn-label">
        {moodLabels[mood]}
      </div>
    </div>,
    document.body
  );
});

export default UnicornAvatar;
