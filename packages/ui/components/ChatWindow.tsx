'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Document } from '@langchain/core/documents';
import Navbar from './Navbar';
import Chat from './Chat';
import crypto from 'crypto';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSuggestions } from '@/lib/actions';
import {
  trackConversationStart,
  trackUserMessage,
  initUserFeedbackStats,
} from '@/lib/posthog';

// Only lazy load EmptyChat as it doesn't use MathJax
const EmptyChat = dynamic(() => import('./EmptyChat'), { ssr: false });

export type Message = {
  messageId: string;
  chatId: string;
  createdAt: Date;
  content: string;
  role: 'user' | 'assistant';
  suggestions?: string[];
  sources?: Document[];
  // Streaming reasoning/thinking support
  thinking?: string;
  // Whether the thinking box should be collapsed by default
  thinkingCollapsed?: boolean;
  // Processing indicator while waiting for first tokens
  processing?: boolean;
  processingText?: string;
};

// Simple API ready check
const useApiReady = (
  setIsApiReady: (ready: boolean) => void,
  setError: (error: boolean) => void,
) => {
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`/api/cairo-coder/v1/agents`, {
          method: 'GET',
        });
        if (response.ok) {
          setIsApiReady(true);
          setError(false);
        } else {
          setError(true);
          toast.error(
            'Failed to connect to the server. Please try again later.',
          );
        }
      } catch (err) {
        setError(true);
        toast.error('Failed to connect to the server. Please try again later.');
      }
    };

    checkApi();
  }, [setIsApiReady, setError]);
};

export type StoredChat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

const saveMessagesToLocalStorage = (chatId: string, messages: Message[]) => {
  const existingChats = JSON.parse(
    localStorage.getItem('chats') || '[]',
  ) as StoredChat[];
  const chatIndex = existingChats.findIndex((chat) => chat.id === chatId);

  const updatedChat: StoredChat = {
    id: chatId,
    title: messages[0].content,
    messages,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  console.log('[DEBUG] saving messages to local storage', updatedChat);

  if (chatIndex !== -1) {
    existingChats[chatIndex] = updatedChat;
  } else {
    existingChats.push(updatedChat);
  }

  localStorage.setItem('chats', JSON.stringify(existingChats));
};

const loadMessagesFromLocalStorage = (chatId: string): Message[] | null => {
  const existingChats = JSON.parse(
    localStorage.getItem('chats') || '[]',
  ) as StoredChat[];
  const chat = existingChats.find((chat) => chat.id === chatId);

  if (chat) {
    return chat.messages;
  }

  return null;
};

const ChatWindow = ({
  id,
  initialMessage: initialMessageProp,
  onBack,
}: {
  id?: string;
  initialMessage?: string;
  onBack?: () => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Capture initial message from URL only once on first render
  const initialMessageFromParams =
    initialMessageProp || searchParams.get('prompt') || searchParams.get('q');
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | null
  >(null);
  useEffect(() => {
    setPendingInitialMessage(initialMessageFromParams || null);
    // We intentionally run once to capture the initial params before any route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [isApiReady, setIsApiReady] = useState(false);
  useApiReady(setIsApiReady, setHasError);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      const storedMessages = loadMessagesFromLocalStorage(chatId);
      if (storedMessages) {
        setMessages(storedMessages);
        const history = storedMessages.map((msg) => {
          return [msg.role, msg.content];
        }) as [string, string][];
        setChatHistory(history);
      }
      setIsMessagesLoaded(true);
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new chat is created (no id prop passed), navigate to /c/<chatId> without full reload
  useEffect(() => {
    if (!id && chatId) {
      router.replace(`/c/${chatId}`);
    }
  }, [id, chatId, router]);

  useEffect(() => {
    // Initialize PostHog user feedback stats when the component mounts
    initUserFeedbackStats();
  }, []);

  useEffect(() => {
    if (isMessagesLoaded && isApiReady && chatId) {
      // Track conversation start if this is a new chat
      if (newChatCreated) {
        trackConversationStart(chatId);
      }
      setIsReady(true);
    }
  }, [isMessagesLoaded, isApiReady, chatId, newChatCreated]);

  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isApiReady) {
      setIsReady(true);
    }
  }, [isMessagesLoaded, isApiReady]);

  const sendMessage = async (message: string) => {
    if (loading) return;
    setLoading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let recievedMessage = '';
    let added = false;
    let assistantMessageId = '';
    let thinking: string = '';
    let thinkingCollapsed = false; // expand while streaming
    let processing = false;
    let processingText = '';

    const messageId = crypto.randomBytes(7).toString('hex');

    // Emit event when a user message is sent.
    trackUserMessage(message.length);

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        messageId: messageId,
        chatId: chatId!,
        role: 'user',
        createdAt: new Date(),
      },
    ]);

    try {
      // Build messages array in OpenAI format
      const messagesPayload = [
        ...chatHistory.map(([role, content]) => ({
          role: role === 'human' ? 'user' : 'assistant',
          content,
        })),
        { role: 'user', content: message },
      ];

      const response = await fetch(
        `/api/cairo-coder/v1/agents/starknet-agent/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesPayload,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        // @ts-ignore
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6); // Remove 'data: ' prefix

          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle error events
            if (parsed.type === 'error') {
              toast.error(parsed.data || 'An error occurred');
              setLoading(false);
              return;
            }

            // Handle sources event (custom type from Cairo Coder)
            if (parsed.type === 'sources') {
              sources = parsed.data;
              console.log('[DEBUG] sources', sources);
              if (!assistantMessageId) {
                assistantMessageId =
                  parsed.messageId || crypto.randomBytes(7).toString('hex');
              }
              if (!added) {
                setMessages((prevMessages) => [
                  ...prevMessages,
                  {
                    content: '',
                    messageId: assistantMessageId,
                    chatId: chatId!,
                    role: 'assistant',
                    sources: sources,
                    thinking,
                    thinkingCollapsed,
                    processing,
                    processingText,
                    createdAt: new Date(),
                  },
                ]);
                added = true;
              }
              // If assistant message already added, update sources
              if (added) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.messageId === assistantMessageId
                      ? { ...msg, sources }
                      : msg,
                  ),
                );
              }
              setMessageAppeared(true);
            }

            // Handle thinking event (custom type from Cairo Coder)
            if (parsed.type === 'thinking') {
              const chunk = String(parsed.data ?? '');
              thinking = thinking
                ? `${thinking}${thinking.endsWith('\n') ? '' : '\n'}${chunk}`
                : chunk;

              // Ensure an assistant message exists to display thinking
              if (!added) {
                if (!assistantMessageId) {
                  assistantMessageId =
                    parsed.messageId || crypto.randomBytes(7).toString('hex');
                }
                setMessages((prevMessages) => [
                  ...prevMessages,
                  {
                    content: '',
                    messageId: assistantMessageId,
                    chatId: chatId!,
                    role: 'assistant',
                    sources: sources,
                    thinking,
                    thinkingCollapsed, // expanded while streaming
                    processing,
                    processingText,
                    createdAt: new Date(),
                  },
                ]);
                added = true;
              } else {
                // Update existing assistant message with appended thinking
                const t = thinking;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.messageId === assistantMessageId
                      ? { ...msg, thinking: t }
                      : msg,
                  ),
                );
              }
              setMessageAppeared(true);
            }

            // Handle processing event (custom type from Cairo Coder)
            if (parsed.type === 'processing') {
              processing = true;
              processingText = String(parsed.data ?? 'Generating response');
              if (!added) {
                if (!assistantMessageId) {
                  assistantMessageId =
                    parsed.messageId || crypto.randomBytes(7).toString('hex');
                }
                setMessages((prevMessages) => [
                  ...prevMessages,
                  {
                    content: '',
                    messageId: assistantMessageId,
                    chatId: chatId!,
                    role: 'assistant',
                    sources: sources,
                    thinking,
                    thinkingCollapsed,
                    processing,
                    processingText,
                    createdAt: new Date(),
                  },
                ]);
                added = true;
              } else {
                const pt = processingText;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.messageId === assistantMessageId
                      ? { ...msg, processing: true, processingText: pt }
                      : msg,
                  ),
                );
              }
              setMessageAppeared(true);
            }

            // Handle OpenAI-format response chunks
            if (parsed.choices && parsed.choices[0]) {
              const choice = parsed.choices[0];

              if (!assistantMessageId && parsed.id) {
                assistantMessageId = parsed.id;
              }

              if (choice.delta && choice.delta.content) {
                const content = choice.delta.content;

                if (!added) {
                  if (!assistantMessageId && parsed.id) {
                    assistantMessageId = parsed.id;
                  } else if (!assistantMessageId) {
                    assistantMessageId = crypto.randomBytes(7).toString('hex');
                  }
                  setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                      content: content,
                      messageId:
                        assistantMessageId ||
                        crypto.randomBytes(7).toString('hex'),
                      chatId: chatId!,
                      role: 'assistant',
                      sources: sources,
                      thinking,
                      thinkingCollapsed: true, // collapse thinking on first chunk
                      processing: false,
                      processingText,
                      createdAt: new Date(),
                    },
                  ]);
                  added = true;
                  thinkingCollapsed = true;
                } else {
                  // On first chunk, collapse the thinking panel
                  if (!thinkingCollapsed) {
                    thinkingCollapsed = true;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.messageId === assistantMessageId
                          ? { ...msg, thinkingCollapsed: true }
                          : msg,
                      ),
                    );
                  }
                  // Stop processing indicator when first content arrives
                  if (processing) {
                    processing = false;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.messageId === assistantMessageId
                          ? { ...msg, processing: false }
                          : msg,
                      ),
                    );
                  }
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.messageId === assistantMessageId) {
                        return { ...msg, content: msg.content + content };
                      }
                      return msg;
                    }),
                  );
                }

                recievedMessage += content;
                setMessageAppeared(true);
              }

              // Handle end of stream
              if (choice.finish_reason === 'stop') {
                break;
              }
            }

            // Handle final_response event: replace streamed text with final text
            if (parsed.type === 'final_response') {
              const finalText = parsed.data as string;

              // Ensure an assistant message exists
              if (!added) {
                assistantMessageId =
                  assistantMessageId || crypto.randomBytes(7).toString('hex');
                setMessages((prevMessages) => [
                  ...prevMessages,
                  {
                    content: finalText,
                    messageId: assistantMessageId,
                    chatId: chatId!,
                    role: 'assistant',
                    sources: sources,
                    thinking,
                    thinkingCollapsed: true, // collapse thinking at final response
                    processing: false,
                    processingText,
                    createdAt: new Date(),
                  },
                ]);
                added = true;
              } else {
                // Replace existing streamed content with the final content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.messageId === assistantMessageId
                      ? {
                          ...msg,
                          content: finalText,
                          thinkingCollapsed: true,
                          processing: false,
                        }
                      : msg,
                  ),
                );
              }

              // Keep local accumulator in sync with final content
              recievedMessage = finalText;
              setMessageAppeared(true);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }

      // Message complete
      setChatHistory((prevHistory) => [
        ...prevHistory,
        ['human', message],
        ['assistant', recievedMessage],
      ]);

      setLoading(false);

      // After the stream completes, attach suggestions if available,
      // then persist the finalized message state atomically.
      let updatedMessages = messagesRef.current;
      let didAttachSuggestions = false;

      const lastMsg = updatedMessages[updatedMessages.length - 1];

      try {
        if (
          lastMsg &&
          lastMsg.role === 'assistant' &&
          lastMsg.sources &&
          lastMsg.sources.length > 0 &&
          !lastMsg.suggestions
        ) {
          const suggestions = await getSuggestions(updatedMessages);
          // Update UI by merging suggestions onto the latest state to avoid overwriting content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === lastMsg.messageId
                ? { ...msg, suggestions }
                : msg,
            ),
          );
          didAttachSuggestions = true;
        }
      } catch (e) {
        // If suggestions fail, proceed to save the answer + sources only.
        // This avoids losing the conversation while still aiming for atomicity when possible.
      }

      // Give React a tick to flush the latest state updates (content/sources/suggestions)
      await new Promise((r) => setTimeout(r, 0));
      updatedMessages = messagesRef.current;

      // Save only when we have a concrete assistant reply (avoid saving partial states)
      const finalAssistant = updatedMessages
        .slice()
        .reverse()
        .find((m) => m.role === 'assistant');
      if (
        finalAssistant &&
        finalAssistant.content &&
        finalAssistant.content.length > 0
      ) {
        saveMessagesToLocalStorage(chatId!, updatedMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setLoading(false);
    }
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    const message = messages[index - 1];

    setMessages((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    setChatHistory((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    sendMessage(message.content);
  };

  // Auto-send initial message captured from params (if any)
  useEffect(() => {
    if (isReady && pendingInitialMessage) {
      const msg = pendingInitialMessage;
      setPendingInitialMessage(null);
      sendMessage(msg);
    }
  }, [isReady, pendingInitialMessage]);

  // If landing page stored a pending prompt in sessionStorage for this chat, send it
  useEffect(() => {
    if (isReady && chatId && !pendingInitialMessage) {
      try {
        const key = `pendingPrompt:${chatId}`;
        const stored = sessionStorage.getItem(key);
        if (stored && stored.trim()) {
          sessionStorage.removeItem(key);
          sendMessage(stored);
        }
      } catch {}
    }
  }, [isReady, chatId, pendingInitialMessage]);

  if (hasError) {
    toast.error('Failed to connect to the server. Please try again later.');
  }

  return isReady || messages.length > 0 ? (
    <div>
      {messages.length > 0 ? (
        <>
          <Navbar messages={messages} />
          <Chat
            loading={loading}
            messages={messages}
            sendMessage={sendMessage}
            messageAppeared={messageAppeared}
            rewrite={rewrite}
          />
        </>
      ) : (
        <EmptyChat sendMessage={sendMessage} />
      )}
    </div>
  ) : (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  );
};
export type ChatWindowProps = {
  id?: string;
  initialMessage?: string;
  onBack?: () => void;
};

export default ChatWindow;
