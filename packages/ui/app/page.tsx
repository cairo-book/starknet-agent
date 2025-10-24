import LandingPage from '@/components/LandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask Starknet - Unlock your Starknet expertise',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/ask_logo_white_alpha.png',
  },
};

const Home = () => {
  return <LandingPage />;
};

export default Home;
