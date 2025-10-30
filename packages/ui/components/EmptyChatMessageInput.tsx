import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

const EmptyChatMessageInput = ({
  sendMessage,
}: {
  sendMessage: (message: string) => void;
}) => {
  const [message, setMessage] = useState('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        // Always prevent default form submission/navigation
        e.preventDefault();
        // For plain Enter or submit button click, send. Keyboard modifiers handled via onKeyDown
        if (message.trim().length === 0) return;
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Only Shift+Enter creates newline, all other combinations submit
          if (e.shiftKey) {
            // Allow default behavior (newline)
            return;
          }
          // Plain Enter or Cmd/Ctrl/Alt+Enter submits
          e.preventDefault();
          if (message.trim().length === 0) return;
          sendMessage(message);
          setMessage('');
        }
      }}
      className="w-full"
    >
      <div className="flex flex-col bg-light-secondary dark:bg-dark-secondary px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5 pb-2 rounded-lg w-full">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything..."
          className="bg-transparent placeholder:text-black/50 dark:placeholder:text-white/50 text-base sm:text-lg text-black dark:text-white resize-none focus:outline-none w-full py-2 sm:py-3 max-h-48"
          minRows={1}
        />
        <div className="flex flex-row items-center justify-end mt-3 sm:mt-4">
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-transparent text-black dark:text-white disabled:text-gray-400 dark:disabled:text-gray-500 hover:scale-110 transition-all duration-200 rounded-full p-1 sm:p-2"
          >
            <svg
              className="w-4 h-4 sm:w-[17px] sm:h-[17px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
