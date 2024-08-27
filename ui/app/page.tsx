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
    <>
      <div className="starry-background" />
      <div className="content-wrapper">
        <Suspense>
          <ChatWindow />
        </Suspense>
      </div>
    </>
  );
};

export default Home;
