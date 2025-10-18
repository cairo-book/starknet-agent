import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import ThemeProvider from '@/components/theme/Provider';
import PostHogProviderClient from '@/components/providers/PostHogProvider';
import GoogleAnalytics from '@/components/providers/GoogleAnalytics';
import { MathJaxContext } from 'better-react-mathjax';

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Ask Starknet - Unlock your Starknet expertise',
  description: 'AI-powered assistant for Starknet and Cairo.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = {
    loader: { load: ['[tex]/boldsymbol', '[tex]/ams', '[tex]/html'] },
    tex: {
      packages: { '[+]': ['boldsymbol', 'ams', 'html'] },
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\[', '\\]'],
      ],
    },
    svg: { fontCache: 'global' },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      ignoreHtmlClass: 'tex2jax_ignore',
      processHtmlClass: 'tex2jax_process',
    },
    startup: {
      typeset: false, // Don't typeset on startup, let components control it
    },
  };
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={cn('h-full', ibmPlexSans.className)}>
        <GoogleAnalytics />
        <PostHogProviderClient>
          <MathJaxContext config={config}>
            <ThemeProvider>
              {children}
              <Toaster
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast:
                      'bg-light-primary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                  },
                }}
              />
            </ThemeProvider>
          </MathJaxContext>
        </PostHogProviderClient>
      </body>
    </html>
  );
}
