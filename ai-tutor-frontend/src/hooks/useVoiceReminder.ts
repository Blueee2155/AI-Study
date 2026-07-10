import { useCallback, useRef } from 'react';

const REMINDER_MESSAGES: Record<string, string[]> = {
  focused: [
    '太棒啦！继续保持这个专注状态哦~ ✨',
    '你认真学习的样子真好看！加油呀~ 🌟',
    '专注力满分，学习效率up up~ 💪',
  ],
  distracted: [
    '咦？是不是走神啦？让我们回到学习上吧~ 🎯',
    '注意力跑偏了呢，一起回来继续加油~ 🦄',
    '小可爱，课本在这里哦，别发呆啦~ 📚',
  ],
  drowsy: [
    '有点累了吗？深呼吸一下，打起精神来~ ',
    '困困的时候更要坚持一下下哦，你可以的~ ⭐',
    '喝口水活动一下，然后继续加油~ ',
  ],
  away: [
    '你去哪里啦？记得回来继续学习哦~ 🌈',
    '休息一下可以，但别忘了我们的学习目标呀~ 🎯',
    '快回来吧，独角兽想你了~ 🦄',
  ],
  break: [
    '已经学习 20 分钟啦！起来走动一下，眺望远方放松眼睛吧~',
    '专注学习 20 分钟，给自己一个短暂的休息奖励吧~',
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
    utterance.rate = 1.5;   // 语速较快，更自然流畅
    utterance.pitch = 1.2;  // 音调更柔和，更有亲切感
    utterance.volume = 0.9; // 音量稍大，更清晰

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
