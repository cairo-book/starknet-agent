import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Chat - Ask Starknet',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/ask_logo_white_alpha.png',
  },
};

const ChatPage = () => {
  return (
    <div className="content-wrapper">
      <Suspense>
        <ChatWindow />
      </Suspense>
    </div>
  );
};

export default ChatPage;
