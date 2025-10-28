'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useEffect, useState } from 'react';
import { Message } from './ChatWindow';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Layers3,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  X,
  ChevronDown,
} from 'lucide-react';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { trackFeedback } from '@/lib/posthog';
import type { Document } from '@langchain/core/documents';
import { MathJax } from 'better-react-mathjax';

// Common styling patterns (unchanged)
const styles = {
  messageBubble: {
    base: 'rounded-2xl px-2 sm:px-3 md:px-4 py-2',
    user: 'text-black dark:text-white',
    assistant: 'text-black dark:text-white',
  },
  inlineCode: {
    base: 'px-1 sm:px-1.5 py-0.5 rounded-md font-mono text-[0.8em] sm:text-[0.85em] md:text-[0.9em] break-words whitespace-normal',
    user: 'bg-grey-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200',
    assistant:
      'bg-grey-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200',
  },
  codeBlock: {
    base: 'relative group rounded-lg overflow-hidden',
    header:
      'absolute top-0 left-0 right-0 h-6 sm:h-7 md:h-8 bg-gray-800/50 dark:bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/20',
    background: 'bg-[#1E1E1E]',
    border: 'border border-gray-800',
    padding: 'px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3',
    fontSize: 'text-xs sm:text-[13px] md:text-sm',
    wrapper:
      'overflow-x-auto whitespace-pre-wrap break-words mt-2 sm:mt-3 md:mt-5',
  },
  copyButton: {
    base: cn(
      'absolute right-1 sm:right-1.5 md:right-2 top-1 sm:top-1.5 md:top-2 p-1 sm:p-1.5 rounded-md bg-gray-700/50 backdrop-blur-sm',
      'opacity-0 group-hover:opacity-100',
      'hover:scale-110 transition-all duration-150',
    ),
  },
  avatar: {
    base: 'flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center',
    assistant: 'bg-blue-100 dark:bg-blue-900',
    assistantIcon: 'text-blue-600 dark:text-blue-300',
    user: 'bg-blue-600',
    userIcon: 'text-white',
  },
  messageContainer: {
    base: 'flex flex-col space-y-1 sm:space-y-1.5 md:space-y-2',
    maxWidth: 'max-w-[92%] sm:max-w-[88%] md:max-w-[85%] lg:max-w-[80%]',
    user: 'items-end',
    assistant: 'items-start',
  },
  prose: {
    base: cn(
      'prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0',
      'max-w-none break-words text-xs sm:text-sm md:text-base',
      'prose-pre:overflow-x-auto prose-pre:scrollbar-thin prose-pre:scrollbar-thumb-gray-400 prose-pre:scrollbar-track-gray-200',
      'dark:prose-pre:scrollbar-thumb-gray-600 dark:prose-pre:scrollbar-track-gray-800',
    ),
    user: 'prose-headings:text-black dark:prose-headings:text-white prose-p:text-black dark:prose-p:text-white',
  },
  sources: {
    container: 'mt-2 transition-all',
    header: cn(
      'flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      'cursor-pointer select-none',
    ),
    content:
      'mt-2 pl-4 sm:pl-6 border-l-2 border-gray-200 dark:border-gray-700',
    icon: 'w-3 h-3 sm:w-4 sm:h-4 rotate-180 transition-transform duration-200',
  },
  thinking: {
    container: 'mt-2 transition-all',
    header: cn(
      'flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      'cursor-pointer select-none',
    ),
    content: cn(
      'mt-2 pl-4 sm:pl-6 border-l-2 border-gray-200 dark:border-gray-700',
      'text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap break-words text-xs sm:text-sm md:text-base',
    ),
    icon: 'w-3 h-3 sm:w-4 sm:h-4 rotate-180 transition-transform duration-200',
  },
  suggestions: {
    container: 'mt-3 sm:mt-4 transition-all',
    header: cn(
      'flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      'cursor-pointer select-none',
    ),
    content: 'mt-2 space-y-2',
    button: cn(
      'w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg',
      'bg-gray-100 dark:bg-gray-800/50',
      'hover:bg-gray-200 dark:hover:bg-gray-700/50',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      'transition-colors text-xs sm:text-sm text-gray-700 dark:text-gray-300',
    ),
  },
  actions: {
    container: 'flex items-center gap-1 mt-2',
    button: cn(
      'p-1 sm:p-1.5 rounded-lg text-gray-500 dark:text-gray-400',
      'hover:bg-gray-100 dark:hover:bg-gray-800',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      'transition-colors',
    ),
  },
  latex: {
    inline: 'mx-1 text-current', // Adjusted for MathJax output if needed
    block: 'my-2 text-left overflow-x-auto py-1 px-2', // Adjusted for MathJax output
    container: 'bg-gray-50 dark:bg-gray-900 rounded-lg', // Container for block math
  },
} as const;

// Animated hourglass for processing indicator
const AnimatedHourglass = ({ interval = 500 }: { interval?: number }) => {
  const frames = ['⏳', '⌛'];
  const [i, setI] = React.useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((c) => (c + 1) % frames.length),
      interval,
    );
    return () => clearInterval(id);
  }, [interval]);
  return (
    <span className="inline-block mr-1" aria-hidden>
      {frames[i]}
    </span>
  );
};

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-300 hover:text-white"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

// Custom component for rendering code blocks
const CodeBlock = ({
  language,
  children,
  isComplete,
}: {
  language: string;
  children: string;
  isComplete: boolean;
}) => {
  const codeBlockClass = cn(
    styles.codeBlock.base,
    styles.codeBlock.background,
    styles.codeBlock.border,
    !isComplete && 'animate-pulse',
  );

  return (
    <div className={codeBlockClass}>
      {language && language !== 'text' && (
        <div className={styles.codeBlock.header}>
          <div className="flex items-center h-full px-2 sm:px-3 md:px-4">
            <span className="text-[10px] sm:text-xs text-gray-400">
              {language}
            </span>
          </div>
        </div>
      )}
      <button
        onClick={() => navigator.clipboard.writeText(children)}
        className={cn(styles.copyButton.base, !isComplete && 'hidden')}
        title="Copy code"
      >
        <CopyIcon />
      </button>
      <div
        className={cn(
          styles.codeBlock.wrapper,
          language !== 'text' ? 'pt-6 sm:pt-7 md:pt-8' : '', // Adjust padding if header is present
          styles.codeBlock.padding,
        )}
      >
        <SyntaxHighlighter
          language={language === 'cairo' ? 'rust' : language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            background: 'transparent',
            fontSize: 'inherit',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
          className={styles.codeBlock.fontSize}
          wrapLines={true}
          wrapLongLines={true}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Custom component for rendering LaTeX formulas
const LatexRenderer = ({
  isBlock = false,
  children,
  isLoading = false,
}: {
  isBlock?: boolean;
  children: string; // Expect a raw formula string
  isLoading?: boolean;
}) => {
  const formula = String(children || '').trim();
  const [renderError, setRenderError] = React.useState(false);

  if (!formula) {
    return null;
  }

  // Don't render MathJax while content is still loading/streaming
  if (isLoading) {
    return (
      <code
        className={cn(
          styles.inlineCode.base,
          styles.inlineCode.assistant,
          'animate-pulse',
        )}
      >
        {isBlock ? `$$${formula}$$` : `$${formula}$`}
      </code>
    );
  }

  if (renderError) {
    // Fallback: render the formula as inline code
    return (
      <code className={cn(styles.inlineCode.base, styles.inlineCode.assistant)}>
        {isBlock ? `$$${formula}$$` : `$${formula}$`}
      </code>
    );
  }

  try {
    if (isBlock) {
      return (
        <div
          className={cn(
            styles.codeBlock.base, // Use similar styling as code blocks for consistency
            styles.codeBlock.border,
            styles.latex.container, // Specific container style for block LaTeX
            'relative group',
          )}
        >
          <button
            onClick={() => navigator.clipboard.writeText(formula)}
            className={cn(styles.copyButton.base)}
            title="Copy formula"
          >
            <CopyIcon />
          </button>
          <div className={cn(styles.latex.block)}>
            <MathJax
              onError={() => setRenderError(true)}
              hideUntilTypeset="every"
            >
              {`$$${formula}$$`}
            </MathJax>
          </div>
        </div>
      );
    } else {
      // Inline LaTeX
      return (
        <span
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from bubbling to parent if nested
            navigator.clipboard.writeText(formula);
          }}
          className={cn(styles.latex.inline, 'cursor-pointer')}
          title="Click to copy formula"
        >
          <MathJax
            inline
            onError={() => setRenderError(true)}
            hideUntilTypeset="every"
          >
            {`$${formula}$`}
          </MathJax>
        </span>
      );
    }
  } catch (error) {
    console.error('LaTeX rendering error:', error, 'Formula:', formula);
    // Fallback: render the formula as inline code
    return (
      <code className={cn(styles.inlineCode.base, styles.inlineCode.assistant)}>
        {isBlock ? `$$${formula}$$` : `$${formula}$`}
      </code>
    );
  }
};

// Component to render text potentially mixed with inline LaTeX
const TextWithInlineMath = ({
  text,
  isLoading = false,
}: {
  text: string;
  isLoading?: boolean;
}) => {
  if (typeof text !== 'string') {
    // Should not happen if called correctly, but good to be safe
    return <>{text}</>;
  }

  // Regex to split by $...$ but not $$...$$ (handled by block math)
  // It captures $non-$ characters until the next non-escaped $
  // This simplified regex looks for $ signs and content between them.
  // It doesn't handle escaped $ within formulas.
  const parts = text.split(/(\$[^$\n]+\$)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const formula = part.substring(1, part.length - 1);
          return (
            <LatexRenderer key={index} isBlock={false} isLoading={isLoading}>
              {formula}
            </LatexRenderer>
          );
        }
        // Return text parts as React Fragments to avoid unnecessary spans
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

// Helper to recursively process children for inline math
const renderChildrenWithInlineMath = (
  children: React.ReactNode,
  isLoading = false,
): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <TextWithInlineMath text={child} isLoading={isLoading} />;
    }
    if (React.isValidElement(child) && child.props.children) {
      // Check if the element type should have its children processed
      // For example, don't process children of 'a' tags if they have specific formatting needs
      // or if they are already custom components like CodeBlock or LatexRenderer.
      // For common markdown elements like em, strong, etc., this recursion is fine.
      const type = child.type as string | React.JSXElementConstructor<any>;
      if (
        typeof type === 'string' &&
        ['em', 'strong', 'del', 'a', 'mark', 'sub', 'sup'].includes(type)
      ) {
        return React.cloneElement(child, {
          ...child.props,
          children: renderChildrenWithInlineMath(
            child.props.children,
            isLoading,
          ),
        });
      }
    }
    return child;
  });
};

const MessageFeedback = ({
  /* ... (unchanged component) ... */ messageId,
  chatId,
  conversationHistory,
  content,
  sources,
}: {
  messageId: string;
  chatId: string;
  conversationHistory: string;
  content: string;
  sources?: Document[];
}) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(
    null,
  );
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (feedback === type) return;
    setFeedback(type);
    if (type === 'positive') {
      trackFeedback(
        type,
        chatId,
        messageId,
        content,
        undefined,
        undefined,
        sources,
      );
    } else {
      setShowFeedbackModal(true);
    }
  };

  const submitFeedbackText = () => {
    trackFeedback(
      'negative',
      chatId,
      messageId,
      content,
      conversationHistory,
      feedbackText,
      sources,
    );
    setShowFeedbackModal(false);
  };

  const handleCloseModal = () => {
    if (feedback === 'negative' && !showFeedbackModal) {
      // only track if modal was not yet shown or submitted
      // This logic might be redundant if feedback is always tracked on submit/explicit close.
      // Current logic: If user clicks thumbs down, modal shows. If they close modal without submitting text,
      // this path is taken.
    }
    // Simpler: track negative feedback when modal is closed IF it hasn't been submitted.
    // The problem is, 'feedback' state is already 'negative'.
    // Let's assume feedback is tracked on submit, or if closed without text, track without text.
    // The current logic in place for handleFeedback and submitFeedbackText seems to cover this.
    // handleCloseModal can be simplified or ensure it doesn't double-track.
    // For now, if user closes modal, we assume they might not have submitted specific text, so original negative feedback (without text) is sent.
    // This behavior is preserved from original code.
    if (feedback === 'negative' && showFeedbackModal) {
      // Ensure it was shown and is now being closed
      trackFeedback(
        'negative',
        chatId,
        messageId,
        content,
        conversationHistory, // Or undefined if not providing context on simple close
        '', // Empty feedback text
        sources,
      );
    }
    setShowFeedbackModal(false);
  };

  return (
    <div className="mt-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mr-0 sm:mr-1">
          Was this response helpful?
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFeedback('positive')}
            className={cn(
              'p-1 rounded-md transition-colors',
              feedback === 'positive'
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
            )}
            aria-label="Thumbs up"
          >
            <ThumbsUp size={14} className="sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => handleFeedback('negative')}
            className={cn(
              'p-1 rounded-md transition-colors',
              feedback === 'negative'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
            )}
            aria-label="Thumbs down"
          >
            <ThumbsDown size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
        {feedback && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-0 sm:ml-1">
            {feedback === 'positive'
              ? 'Thanks for your feedback!'
              : 'Thanks for your feedback.'}
          </span>
        )}
      </div>

      {showFeedbackModal && (
        <div className="mt-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs sm:text-sm font-medium">
              What was wrong with this response?
            </h4>
            <button
              onClick={handleCloseModal}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="w-full p-2 text-xs sm:text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Please describe the issue (optional)"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitFeedbackText}
              className="px-2 sm:px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
}: {
  message: Message;
  messageIndex: number;
  history: Message[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
}) => {
  const [showSources, setShowSources] = useState(isLast);
  const [showSuggestions, setShowSuggestions] = useState(isLast);
  // Thinking panel open state: expanded while streaming, auto-collapses on first chunk
  const [showThinking, setShowThinking] = useState(
    message.thinking ? !(message.thinkingCollapsed ?? false) : false,
  );
  const prevThinkingCollapsed = React.useRef<boolean | undefined>(
    message.thinkingCollapsed,
  );
  const [contentReady, setContentReady] = useState(false);
  const isUser = message.role === 'user';

  useEffect(() => {
    if (isLast) {
      setShowSources(true);
      setShowSuggestions(true);
    }
  }, [isLast]);

  // Sync panel with collapse state controlled by stream events
  useEffect(() => {
    if (prevThinkingCollapsed.current !== message.thinkingCollapsed) {
      setShowThinking(!(message.thinkingCollapsed ?? false));
      prevThinkingCollapsed.current = message.thinkingCollapsed;
    }
  }, [message.thinkingCollapsed]);

  // Mark content as ready for MathJax typesetting when loading is done
  useEffect(() => {
    if (!loading && message.content && message.role === 'assistant') {
      // Add a small delay to ensure DOM is fully updated
      const timer = setTimeout(() => {
        setContentReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else if (message.role === 'user') {
      setContentReady(true);
    }
  }, [loading, message.content, message.role]);

  // Pre-process content for source links and block LaTeX
  const processedContent = React.useMemo(() => {
    let content = message.content;

    // 1. Replace source links like [1] with <a> tags
    if (
      message.role === 'assistant' &&
      message.sources &&
      message.sources.length > 0
    ) {
      content = content.replace(/\[(\d+)\]/g, (match, numberStr) => {
        const number = parseInt(numberStr, 10);
        const source = message.sources?.[number - 1];
        if (source?.metadata?.url) {
          return `<a href="${source.metadata.url}" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">${number}</a>`;
        }
        return match; // Return original if source or URL not found
      });
    }

    // 2. Convert $$...$$ block math to ```math ... ```
    // This regex ensures $$...$$ is treated as a block element.
    content = content.replace(
      /(?:^|\n)\s*\$\$([\s\S]+?)\$\$\s*(?=\n|$)/g,
      (match, formula) => {
        return `\n\n\`\`\`math\n${formula.trim()}\n\`\`\`\n\n`;
      },
    );

    return content;
  }, [message.content, message.sources, message.role]);

  const markdownOptions: MarkdownToJSX.Options = React.useMemo(
    () => ({
      forceBlock: true, // Ensures paragraphs are blocks, helps with styling
      overrides: {
        // Handle fenced code blocks (```lang ... ```) and block math (```math ... ```)
        pre: (props: any) => {
          const { children } = props;
          // `children` of `pre` is typically a `code` element with props
          if (
            React.isValidElement(children) &&
            (children.props as any)?.className?.startsWith('lang-')
          ) {
            const codeProps = children.props as any; // children.props are the props of the <code> element

            // Extract code string. Markdown-to-jsx usually puts the raw code as a string child of <code>.
            const rawCodeString =
              typeof codeProps.children === 'string'
                ? codeProps.children
                : React.Children.toArray(codeProps.children).join('');

            // Markdown often adds a trailing newline to code blocks, trim it.
            const codeString = rawCodeString.trimEnd();

            const className = (codeProps.className as string) || ''; // e.g., "lang-javascript"
            const langMatch = className.match(/lang-(\w+)/);
            // Normalize language to lowercase and trim, default to 'text'
            const language = langMatch
              ? langMatch[1].trim().toLowerCase()
              : 'text';

            if (language === 'math' || language === 'latex') {
              return (
                <LatexRenderer isBlock={true} isLoading={!contentReady}>
                  {codeString}
                </LatexRenderer>
              );
            }
            return (
              <CodeBlock language={language} isComplete={!loading}>
                {codeString}
              </CodeBlock>
            );
          }
          // Fallback for unusual `pre` structures (e.g. <pre> without <code> child)
          return <pre {...props} />;
        },
        // Handle inline code (`code`)
        code: ({
          children,
          className,
        }: {
          children: React.ReactNode;
          className?: string;
        }) => {
          // If className indicates a language, it's part of a fenced code block.
          // Our `pre` override handles these, so this `code` override is for inline code.
          if (className && className.startsWith('lang-')) {
            // This should ideally not be hit if `pre` override correctly consumes its `code` child.
            // If it does, render children as-is as they are part of a larger handled block.
            return <code className={className}>{children}</code>;
          }
          // For true inline code: `like this`
          // We don't run TextWithInlineMath here to keep $ literal in code.
          return (
            <span
              className={cn(
                styles.inlineCode.base,
                isUser ? styles.inlineCode.user : styles.inlineCode.assistant,
              )}
            >
              {children}
            </span>
          );
        },
        // Process text content in these elements for inline math ($...$)
        p: ({ children }) => (
          <p className="mb-3 sm:mb-4 last:mb-0">
            {renderChildrenWithInlineMath(children, !contentReady)}
          </p>
        ),
        li: ({ children }) => (
          <li>{renderChildrenWithInlineMath(children, !contentReady)}</li>
        ),
        span: ({ children }) => (
          <span>{renderChildrenWithInlineMath(children, !contentReady)}</span>
        ),
        em: ({ children }) => (
          <em>{renderChildrenWithInlineMath(children, !contentReady)}</em>
        ),
        strong: ({ children }) => (
          <strong>
            {renderChildrenWithInlineMath(children, !contentReady)}
          </strong>
        ),
        del: ({ children }) => (
          <del>{renderChildrenWithInlineMath(children, !contentReady)}</del>
        ),
        a: ({ children, ...props }) => (
          <a {...props}>
            {renderChildrenWithInlineMath(children, !contentReady)}
          </a>
        ),
        // Add other text-bearing elements as needed: blockquote, table cells (th, td), etc.
      },
    }),
    [loading, isUser, contentReady],
  );

  return (
    <div
      className={cn(
        'flex w-full items-start gap-1.5 sm:gap-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div
          className={cn(styles.avatar.base, 'bg-transparent')}
          role="img"
          aria-label="Assistant"
        >
          <img
            src="/ask_logo_black_alpha.png"
            alt="Assistant"
            className="w-full h-full object-contain dark:hidden"
          />
          <img
            src="/ask_logo_white_alpha.png"
            alt="Assistant"
            className="w-full h-full object-contain hidden dark:block"
          />
        </div>
      )}
      <div
        ref={dividerRef}
        className={cn(
          styles.messageContainer.base,
          styles.messageContainer.maxWidth,
          isUser
            ? styles.messageContainer.user
            : styles.messageContainer.assistant,
        )}
      >
        {/* Thinking (reasoning) collapsible panel – stays above response text */}
        {!isUser && message.thinking && message.thinking.length > 0 && (
          <div className={styles.thinking.container}>
            <button
              onClick={() => setShowThinking(!showThinking)}
              className={styles.thinking.header}
              aria-expanded={showThinking}
            >
              <ChevronDown
                className={cn(
                  styles.thinking.icon,
                  !showThinking && '!rotate-0',
                )}
              />
              <span className="text-xs sm:text-sm">Thinking</span>
            </button>
            {showThinking && (
              <div className={styles.thinking.content}>{message.thinking}</div>
            )}
          </div>
        )}

        <div
          className={cn(
            styles.messageBubble.base,
            isUser ? styles.messageBubble.user : styles.messageBubble.assistant,
            isUser && 'bg-[#e5e5e5] dark:bg-[#323232]',
          )}
          role={isUser ? 'user message' : 'assistant message'}
        >
          <div className={cn(styles.prose.base, isUser && styles.prose.user)}>
            {!isUser &&
            message.processing &&
            (!message.content || message.content.length === 0) ? (
              <p className="text-gray-500 dark:text-gray-400 italic flex items-center">
                <AnimatedHourglass />
                <span>
                  {message.processingText || 'Generating response...'}
                </span>
              </p>
            ) : contentReady ? (
              <Markdown options={markdownOptions}>{processedContent}</Markdown>
            ) : (
              <div className="animate-pulse">
                <Markdown options={markdownOptions}>
                  {processedContent}
                </Markdown>
              </div>
            )}
          </div>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className={styles.sources.container}>
            <button
              onClick={() => setShowSources(!showSources)}
              className={styles.sources.header}
              aria-expanded={showSources}
            >
              <BookCopy
                className={cn(styles.sources.icon, !showSources && '!rotate-0')}
              />
              <span className="text-xs sm:text-sm">
                Sources ({message.sources.length})
              </span>
            </button>
            {showSources && (
              <div className={styles.sources.content}>
                <MessageSources sources={message.sources} />
              </div>
            )}
          </div>
        )}

        {!loading && !isUser && (
          <div className={styles.actions.container}>
            <Rewrite
              rewrite={rewrite}
              messageId={message.messageId}
              className={styles.actions.button}
            />
            <Copy
              initialMessage={message.content} // Raw content for copy
              message={message}
              className={styles.actions.button}
            />
          </div>
        )}

        {message.suggestions &&
          message.suggestions.length > 0 &&
          !loading &&
          !isUser && (
            <div className={styles.suggestions.container}>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={styles.suggestions.header}
                aria-expanded={showSuggestions}
              >
                <Layers3
                  className={cn(
                    styles.sources.icon, // Using same icon style as sources
                    !showSuggestions && '!rotate-0',
                  )}
                />
                <span className="text-xs sm:text-sm">
                  Related questions ({message.suggestions.length})
                </span>
              </button>
              {showSuggestions && (
                <div className={styles.suggestions.content}>
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className={styles.suggestions.button}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        {!isUser && !loading && (
          <MessageFeedback
            messageId={message.messageId}
            chatId={message.chatId}
            conversationHistory={history.map((h) => h.content).join('\n')}
            content={message.content} // Raw content for feedback
            sources={message.sources}
          />
        )}
      </div>
      {isUser && (
        <div
          className={cn(styles.avatar.base, 'bg-white dark:bg-white')}
          role="img"
          aria-label="User"
        >
          <User
            size={16}
            className="sm:w-5 sm:h-5 md:w-5 md:h-5 text-gray-800"
          />
        </div>
      )}
    </div>
  );
};

export default MessageBox;
