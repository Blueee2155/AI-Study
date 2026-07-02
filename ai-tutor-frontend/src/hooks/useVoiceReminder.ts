import { useCallback, useRef } from 'react';

const REMINDER_MESSAGES: Record<string, string[]> = {
  focused: [
    '专注',
  ],
  distracted: [
    '分心',
  ],
  drowsy: [
    '开小差',
  ],
  away: [
    '离开',
  ],
  break: [
    '已经学习 25 分钟啦！起来走动一下，眺望远方放松眼睛吧~',
    '专注学习 25 分钟，给自己一个短暂的休息奖励吧~',
    '番茄时间到！休息五分钟，然后继续充满活力地学习吧~',
  ],
};

function getRandomMessage(type: string): string {
  const messages = REMINDER_MESSAGES[type] || REMINDER_MESSAGES.focused;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function useVoiceReminder() {
  const isSpeakingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((type: string, customText?: string) => {
    if (!window.speechSynthesis) {
      console.warn('浏览器不支持语音合成');
      return;
    }

    // 如果正在说话，先停止
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
    }

    const text = customText || getRandomMessage(type);
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;   // 语速稍慢，更温柔
    utterance.pitch = 1.1;    // 音调稍高，更亲切
    utterance.volume = 0.8;

    // 尝试选择中文语音
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
  }, []);

  return {
    speak,
    stop,
    isSpeaking: isSpeakingRef.current,
  };
}
