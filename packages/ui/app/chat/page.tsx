import ChatWindow from '@/components/ChatWindow';
import Sidebar from '@/components/Sidebar';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Chat - The Starknet Agent',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/starknet_logo.svg',
  },
};

const ChatPage = () => {
  return (
    <Sidebar>
      <div className="content-wrapper">
        <Suspense>
          <ChatWindow />
        </Suspense>
      </div>
    </Sidebar>
  );
};

export default ChatPage;

