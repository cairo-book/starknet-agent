import LandingPage from '@/components/LandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Starknet Agent - Unlock your Starknet expertise',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/starknet_logo.svg',
  },
};

const Home = () => {
  return <LandingPage />;
};

export default Home;
