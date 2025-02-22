'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useEffect, useState } from 'react';
import { Message } from './ChatWindow';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  User,
  Bot,
} from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import { useSpeech } from 'react-text-to-speech';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Common styling patterns
const styles = {
  messageBubble: {
    base: 'rounded-2xl px-3 sm:px-4 py-2',
    user: 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white',
    assistant: 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white',
  },
  inlineCode: {
    base: 'px-1 sm:px-1.5 py-0.5 rounded-md font-mono text-[0.85em] sm:text-[0.9em] break-words whitespace-normal',
    user: 'bg-grey-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200',
    assistant:
      'bg-grey-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200',
  },
  codeBlock: {
    base: 'relative group rounded-lg overflow-hidden',
    header:
      'absolute top-0 left-0 right-0 h-7 sm:h-8 bg-gray-800/50 dark:bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/20',
    background: 'bg-[#1E1E1E]',
    border: 'border border-gray-800',
    padding: 'px-3 sm:px-4 py-2 sm:py-3',
    fontSize: 'text-[13px] sm:text-sm',
    wrapper: 'overflow-x-auto whitespace-pre-wrap break-words mt-3 sm:mt-5',
  },
  copyButton: {
    base: cn(
      'absolute right-1 sm:right-2 top-1 sm:top-2 p-1 sm:p-1.5 rounded-md bg-gray-700/50 backdrop-blur-sm',
      'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
      'hover:bg-gray-700/70',
    ),
  },
  avatar: {
    base: 'flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
    assistant: 'bg-blue-100 dark:bg-blue-900',
    assistantIcon: 'text-blue-600 dark:text-blue-300',
    user: 'bg-blue-600',
    userIcon: 'text-white',
  },
  messageContainer: {
    base: 'flex flex-col space-y-1.5 sm:space-y-2',
    maxWidth: 'max-w-[90%] sm:max-w-[85%] md:max-w-[80%]',
    user: 'items-end',
    assistant: 'items-start',
  },
  prose: {
    base: cn(
      'prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0',
      'max-w-none break-words text-sm sm:text-base',
      'prose-pre:overflow-x-auto prose-pre:scrollbar-thin prose-pre:scrollbar-thumb-gray-400 prose-pre:scrollbar-track-gray-200',
      'dark:prose-pre:scrollbar-thumb-gray-600 dark:prose-pre:scrollbar-track-gray-800',
    ),
    user: 'prose-headings:text-white prose-p:text-grey dark:prose-headings:text-white dark:prose-p:text-white',
  },
  sources: {
    container: 'mt-2 transition-all',
    header: cn(
      'flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      'cursor-pointer select-none',
    ),
    content: 'mt-2 pl-6 border-l-2 border-gray-200 dark:border-gray-700',
    icon: 'w-4 h-4 rotate-180 transition-transform duration-200',
  },
  suggestions: {
    container: 'mt-4 transition-all',
    header: cn(
      'flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      'cursor-pointer select-none',
    ),
    content: 'mt-2 space-y-2',
    button: cn(
      'w-full text-left px-3 py-2 rounded-lg',
      'bg-gray-100 dark:bg-gray-800/50',
      'hover:bg-gray-200 dark:hover:bg-gray-700/50',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      'transition-colors text-sm text-gray-700 dark:text-gray-300',
    ),
  },
  actions: {
    container: 'flex items-center gap-1 mt-2',
    button: cn(
      'p-1.5 rounded-lg text-gray-500 dark:text-gray-400',
      'hover:bg-gray-100 dark:hover:bg-gray-800',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      'transition-colors',
    ),
  },
} as const;

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
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const [speechMessage, setSpeechMessage] = useState(message.content);
  const [showSources, setShowSources] = useState(isLast);
  const [showSuggestions, setShowSuggestions] = useState(isLast);
  const isUser = message.role === 'user';

  useEffect(() => {
    const regex = /\[(\d+)\]/g;

    if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length > 0
    ) {
      setParsedMessage(
        message.content.replace(
          regex,
          (_, number) =>
            `<a href="${message.sources?.[number - 1]?.metadata?.url}" target="_blank" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative">${number}</a>`,
        ),
      );
      return;
    }

    setSpeechMessage(message.content.replace(regex, ''));
    setParsedMessage(message.content);
  }, [message.content, message.sources, message.role]);

  // Update expanded state when isLast changes
  useEffect(() => {
    if (isLast) {
      setShowSources(true);
      setShowSuggestions(true);
    }
  }, [isLast]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  return (
    <div
      className={cn(
        'flex w-full items-start gap-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div
          className={cn(styles.avatar.base, styles.avatar.assistant)}
          role="img"
          aria-label="Assistant"
        >
          <Bot size={20} className={styles.avatar.assistantIcon} />
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
        <div
          className={cn(
            styles.messageBubble.base,
            isUser ? styles.messageBubble.user : styles.messageBubble.assistant,
          )}
          role={isUser ? 'user message' : 'assistant message'}
        >
          <Markdown
            options={{
              overrides: {
                code: ({
                  className,
                  children,
                }: {
                  className?: string;
                  children: string;
                }) => {
                  let language = className
                    ? className.replace('lang-', '')
                    : 'text';
                  if (language == 'cairo') {
                    language = 'rust';
                  }
                  const isInline = !className || className === 'language-text';
                  const [isComplete, setIsComplete] = useState(false);

                  useEffect(() => {
                    const hasClosingBackticks = !children.trim().endsWith('`');
                    setIsComplete(hasClosingBackticks);
                  }, [children]);

                  if (isInline) {
                    return (
                      <span
                        className={cn(
                          styles.inlineCode.base,
                          isUser
                            ? styles.inlineCode.user
                            : styles.inlineCode.assistant,
                          className,
                        )}
                      >
                        {children}
                      </span>
                    );
                  }

                  const codeBlockClass = cn(
                    styles.codeBlock.base,
                    styles.codeBlock.background,
                    styles.codeBlock.border,
                    !isComplete && 'animate-pulse',
                  );

                  const CopyButton = () => (
                    <button
                      onClick={() => navigator.clipboard.writeText(children)}
                      className={cn(
                        styles.copyButton.base,
                        !isComplete && 'hidden',
                      )}
                      title="Copy code"
                    >
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
                        <rect
                          width="14"
                          height="14"
                          x="8"
                          y="8"
                          rx="2"
                          ry="2"
                        />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    </button>
                  );

                  return (
                    <div className={codeBlockClass}>
                      {language !== 'text' && (
                        <div className={styles.codeBlock.header}>
                          <div className="flex items-center h-full px-2 sm:px-4">
                            <span className="text-xs text-gray-400">
                              {language}
                            </span>
                          </div>
                        </div>
                      )}
                      <CopyButton />
                      <div
                        className={cn(
                          styles.codeBlock.wrapper,
                          language !== 'text' ? 'pt-7 sm:pt-8' : '',
                          styles.codeBlock.padding,
                        )}
                      >
                        <SyntaxHighlighter
                          language={language}
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
                },
              },
            }}
            className={cn(styles.prose.base, isUser && styles.prose.user)}
          >
            {parsedMessage}
          </Markdown>
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
              <span>Sources ({message.sources.length})</span>
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
              initialMessage={message.content}
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
                    styles.sources.icon,
                    !showSuggestions && '!rotate-0',
                  )}
                />
                <span>Related questions ({message.suggestions.length})</span>
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
      </div>
      {isUser && (
        <div
          className={cn(styles.avatar.base, styles.avatar.user)}
          role="img"
          aria-label="User"
        >
          <User size={20} className={styles.avatar.userIcon} />
        </div>
      )}
    </div>
  );
};

export default MessageBox;
