'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DeleteChat from '@/components/DeleteChat';
import { StoredChat } from '@/components/ChatWindow';
import { trackHistoryPageViewed, trackHistoryItemClicked } from '@/lib/posthog';
import { v4 as uuidv4 } from 'uuid';
import { Search, X } from 'lucide-react';

const ChatHistory = () => {
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionId] = useState(() => uuidv4());
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isClearAllHovered, setIsClearAllHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedChats = JSON.parse(localStorage.getItem('chats') || '[]');
      setChats(storedChats);

      // Track history page view
      trackHistoryPageViewed(sessionId);
    }
  }, [sessionId]);

  // Sort chats so the most recent (by chat.createdAt) comes first.
  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Filter chats based on search term.
  const filteredChats = sortedChats.filter((chat) =>
    (chat.title || `Chat ${chat.id}`)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  // Handle chat item click
  const handleChatClick = (chatId: string) => {
    trackHistoryItemClicked(chatId);
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-24 pb-24">
      <div className="w-full max-w-2xl lg:max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold">Chat History</h1>
          <div className="flex gap-0 mt-2 md:mt-0 items-center -space-x-1">
            {/* Search icon that expands to input on hover */}
            <div
              className={`relative flex items-center transition-transform duration-200 ${
                isClearAllHovered && !isSearchExpanded && !searchTerm
                  ? '-translate-x-16'
                  : ''
              }`}
              onMouseEnter={() => setIsSearchExpanded(true)}
              onMouseLeave={() => {
                if (searchTerm === '') {
                  setIsSearchExpanded(false);
                }
              }}
            >
              {(isSearchExpanded || searchTerm) && (
                <Search
                  className="absolute left-2 text-gray-500 dark:text-gray-400 z-10 pointer-events-none"
                  size={20}
                />
              )}
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`transition-all duration-300 ease-in-out pl-9 pr-3 py-1.5 rounded-md bg-light-secondary dark:bg-dark-secondary focus:outline-none focus:ring-0 border-0 ${
                  isSearchExpanded || searchTerm
                    ? 'w-64 opacity-100'
                    : 'w-8 opacity-0'
                }`}
                style={{
                  background:
                    isSearchExpanded || searchTerm ? '' : 'transparent',
                }}
              />
              {!isSearchExpanded && !searchTerm && (
                <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Search
                      size={20}
                      className="text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Clear All button as red X icon with text on hover */}
            <div
              className="relative group"
              onMouseEnter={() => setIsClearAllHovered(true)}
              onMouseLeave={() => setIsClearAllHovered(false)}
            >
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-sm text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                Clear All
              </span>
              <button
                onClick={() => {
                  if (window.confirm('Clear all chat history?')) {
                    localStorage.removeItem('chats');
                    setChats([]);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                aria-label="Clear all chats"
              >
                <X size={20} className="text-red-500 dark:text-red-400" />
              </button>
            </div>
          </div>
        </div>
        {filteredChats.length === 0 ? (
          <p>No chats found.</p>
        ) : (
          <ul className="space-y-4">
            {filteredChats.map((chat) => (
              <li
                key={chat.id}
                className="flex items-center justify-between p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg border border-light-200 dark:border-dark-200"
              >
                <div>
                  <Link
                    href={`/c/${chat.id}`}
                    className="text-lg font-medium"
                    onClick={() => handleChatClick(chat.id)}
                  >
                    {chat.title || `Chat ${chat.id}`}
                  </Link>
                  {chat.createdAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(chat.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <DeleteChat
                  chatId={chat.id}
                  chats={chats}
                  setChats={setChats}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
