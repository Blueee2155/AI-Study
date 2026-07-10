import type { Message } from '@/types';
import { marked } from 'marked';
import { useMemo, useEffect, useRef } from 'react';
import { Sparkle, User } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

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
  const contentRef = useRef<HTMLDivElement>(null);

  const htmlContent = useMemo(() => {
    if (isUser) return null;
    if (!message.content) return '';

    let content = message.content;

    // 0. 将 [...] 格式的块级公式转换为 $$...$$ 格式
    //    AI模型使用 [ 和 ] 作为块级公式分隔符（LaTeX惯例），可能跨多行：
    //    a) 多行: \n[\n...latex...\n]\n  (最常见)
    //    b) 单行: \n[...latex...]\n
    //    使用 (^|\n) 和 (\n|$) 确保匹配各种位置（开头/结尾/中间）
    const bracketBlockRe = new RegExp('(^|\\n)\\[\\n([\\s\\S]*?)\\n\\]($|\\n)', 'g');
    content = content.replace(bracketBlockRe, (_match, pre, latex, post) => {
      return `${pre}$$${latex.trim()}$$${post}`;
    });
    // 单行形式: [...latex...] （需包含LaTeX命令才转换，避免误匹配普通方括号）
    const bracketSingleRe = new RegExp('(^|\\n)\\[([\\s\\S]*?)\\]($|\\n)', 'g');
    content = content.replace(bracketSingleRe, (_match, pre, latex, post) => {
      if (latex.includes('\\') && !latex.includes('$$')) {
        return `${pre}$$${latex.trim()}$$${post}`;
      }
      return _match;
    });

    // 1. 保护并直接渲染块级公式 $$...$$ 为 KaTeX HTML
    //    避免 marked 的 breaks:true 在公式内插入 <br> 导致 renderMathInElement 无法匹配分隔符
    const blockFormulas: string[] = [];
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => {
      const idx = blockFormulas.length;
      try {
        const rendered = katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        blockFormulas.push(rendered);
      } catch {
        blockFormulas.push(_match); // 渲染失败时保留原文
      }
      return `\n\nKATEXBLOCKPH${idx}END\n\n`;
    });

    // 2. 保护行内公式 $...$（单行、不含空格开头/结尾）
    const inlineFormulas: string[] = [];
    content = content.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+)\$(?!\$)/g, (_match, formula) => {
      const idx = inlineFormulas.length;
      try {
        const rendered = katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        inlineFormulas.push(rendered);
      } catch {
        inlineFormulas.push(_match);
      }
      return `KATEXINLINEPH${idx}END`;
    });

    // 3. 解析 markdown
    let html = marked.parse(content) as string;

    // 4. 还原块级和行内公式占位符
    blockFormulas.forEach((rendered, i) => {
      html = html.replace(`KATEXBLOCKPH${i}END`, rendered);
    });
    inlineFormulas.forEach((rendered, i) => {
      html = html.replace(`KATEXINLINEPH${i}END`, rendered);
    });

    return html;
  }, [message.content, isUser]);

  // Render math formulas with KaTeX after DOM updates
  useEffect(() => {
    if (isUser || !contentRef.current) return;

    try {
      renderMathInElement(contentRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
    }
  }, [htmlContent, isUser]);

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
            ref={contentRef}
            className={`text-sm leading-relaxed markdown-content ${isStreaming ? 'after:content-[""] after:ml-0.5 after:text-emerald-500 after:animate-pulse' : ''}`}
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
