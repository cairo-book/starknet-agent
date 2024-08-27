import ChatWindow from '@/components/ChatWindow';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'The Starknet Agent - Unlock your Starknet expertise',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/cairo_logo.webp',
  },
};

const Home = () => {
  return (
    <div className="relative min-h-screen">
      <div className="starry-background" />
      <Suspense>
        <ChatWindow />
      </Suspense>
    </div>
  );
};

export default Home;
