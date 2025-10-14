'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Focus from './MessageInputActions/Focus';

const LandingPage = () => {
  const [prompt, setPrompt] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [focusMode, setFocusMode] = useState('starknetEcosystemSearch');
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      setSubmittedPrompt(prompt);
      setIsTransitioning(true);
      // Navigate after the visual transition completes
      setTimeout(() => {
        router.push(`/chat?prompt=${encodeURIComponent(prompt)}&focusMode=${focusMode}`);
      }, 1200);
    }
  };

  const handleChatClick = () => {
    setIsTransitioning(true);
    // Navigate after the visual transition completes
    setTimeout(() => {
      router.push('/chat');
    }, 1200);
  };

  const handleMCPClick = () => {
    setShowMCPConfig(!showMCPConfig);
  };

  const mcpConfig = {
    mcpServers: {
      'cairo-coder': {
        command: 'npx',
        args: ['-y', '@kasarlabs/cairo-coder-mcp'],
        env: {
          CAIRO_CODER_API_KEY: 'your-api-key-here',
        },
      },
    },
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-light-primary dark:bg-dark-primary overflow-hidden">
      {/* Sidebar - slides in from left during transition */}
      <div
        className={`fixed lg:inset-y-0 lg:z-50 lg:w-20 transition-all duration-700 ease-out ${
          isTransitioning
            ? 'lg:translate-x-0 opacity-100'
            : 'lg:-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-full flex-col items-center justify-between gap-y-5 bg-light-secondary dark:bg-dark-secondary px-2 py-8">
          <Image
            src="/starknet_logo_grey.png"
            alt="Starknet Logo"
            width={40}
            height={40}
          />
        </div>
      </div>

      {/* Navbar - slides down from top during transition */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-700 ease-out ${
          isTransitioning
            ? 'translate-y-0 opacity-100 lg:left-20'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-light-secondary dark:bg-dark-secondary border-b border-light-200 dark:border-dark-200 px-4 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center space-x-2">
              <h2 className="text-black dark:text-white text-lg font-medium">
                Starknet Agent
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Input Bar - slides up from bottom during transition */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-700 ease-out ${
          isTransitioning
            ? 'translate-y-0 opacity-100 lg:left-20'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-light-primary dark:bg-dark-primary border-t border-light-200 dark:border-dark-200 px-4 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask a follow-up question..."
                disabled
                className="w-full px-6 py-4 text-base rounded-xl bg-white dark:bg-[#1a1a1a] text-black dark:text-white border-2 border-light-200 dark:border-dark-200 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`h-full transition-all duration-700 ${
          isTransitioning ? 'lg:pl-20' : 'lg:pl-0'
        }`}
      >
        {/* Header with Logo - fades out during transition */}
        <div
          className={`absolute top-8 left-8 flex items-center space-x-3 z-10 transition-all duration-500 ${
            isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <Image
            src="/starknet_logo_grey.png"
            alt="Starknet Logo"
            width={50}
            height={50}
          />
          <span className="text-3xl font-semibold" style={{ color: '#b1b1b1' }}>
            Ask
          </span>
        </div>

        {/* Action Buttons - top right */}
        <div
          className={`absolute top-8 right-8 flex items-center space-x-8 z-10 transition-all duration-500 ${
            isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            onClick={handleChatClick}
            className="text-black dark:text-white font-medium text-2xl hover:scale-105 transition-transform duration-200"
          >
            Chat
          </button>
          <button
            onClick={handleMCPClick}
            className="text-black dark:text-white font-medium text-2xl hover:scale-105 transition-transform duration-200"
          >
            Mcp
          </button>
          <button
            onClick={() => window.open('https://cairo-coder.com', '_blank')}
            className="text-black dark:text-white font-medium text-2xl hover:scale-105 transition-transform duration-200"
          >
            Coder
          </button>
        </div>

        {/* Landing Content - scales down and fades during transition */}
        <div
          className={`flex flex-col items-center justify-center h-full px-4 sm:px-8 transition-all duration-700 ${
            isTransitioning
              ? 'opacity-0 scale-95 pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
        >
          {/* Floating Icons around the center */}
          <FloatingIcons isAnimating={isTransitioning} />

          {/* Centered Title and Input - perfectly centered */}
          <div className="flex flex-col items-center space-y-12 w-full max-w-3xl mx-auto z-10 relative">
            {/* Title */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <h1 className="text-black/70 dark:text-white/100 text-xl sm:text-2xl md:text-3xl font-medium text-center transition-all duration-500">
                {showMCPConfig
                  ? 'Build your own Starknet Agents'
                  : 'Unlock your Starknet expertise.'}
              </h1>
              {showMCPConfig && (
                <p className="text-black/60 dark:text-white/70 text-sm sm:text-base text-center max-w-2xl px-4">
                  Ask Starknet is available as a sophisticated MCP server. Access hundreds of Starknet tools and agents via a single ask_starknet method.
                </p>
              )}
            </div>

            {/* Search Input / MCP Config - with growing transition */}
            <div className="w-full">
              {/* Container that grows */}
              <div
                className={`w-full transition-all duration-700 ease-in-out ${
                  showMCPConfig 
                    ? 'px-0 py-0 bg-transparent' 
                    : isTransitioning
                    ? 'bg-transparent px-5 pt-5 pb-2 rounded-lg overflow-visible'
                    : 'bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 px-5 pt-5 pb-2 rounded-lg overflow-visible'
                }`}
                style={{
                  minHeight: showMCPConfig ? '400px' : 'auto',
                }}
              >
                {/* Search Input Content - slides left */}
                <div
                  className={`transition-all duration-400 ${
                    showMCPConfig
                      ? 'opacity-0 -translate-x-8 h-0 overflow-hidden pointer-events-none'
                      : 'opacity-100 translate-x-0 h-auto'
                  }`}
                >
                  <form onSubmit={handleSubmit} className="w-full">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask anything..."
                      className="bg-transparent placeholder:text-black/50 dark:placeholder:text-white/50 text-lg text-black dark:text-white resize-none focus:outline-none w-full py-3"
                      autoFocus={!showMCPConfig}
                      disabled={isTransitioning}
                    />
                    <div className="flex flex-row items-center justify-between mt-4 relative z-50">
                      <div className="flex flex-row items-center space-x-1 -mx-2">
                        <Focus focusMode={focusMode} setFocusMode={setFocusMode} />
                      </div>
                      <button
                        type="submit"
                        disabled={!prompt.trim() || isTransitioning}
                        className="bg-transparent text-white disabled:text-gray-400 dark:disabled:text-gray-500 hover:scale-110 transition-all duration-200 rounded-full p-2"
                      >
                        <svg
                          className="w-[17px] h-[17px]"
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
                  </form>
                </div>

                {/* MCP Config Content - appears while modal grows */}
                <div
                  className={`transition-all duration-700 ease-in-out ${
                    showMCPConfig
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-4 h-0 overflow-hidden pointer-events-none'
                  }`}
                >
                  <div className="relative">
                    <button
                      onClick={handleCopyConfig}
                      className="absolute top-2 right-2 z-10 p-2 rounded-lg hover:opacity-70 transition-all duration-200"
                      title={copied ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {copied ? (
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-black dark:text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                    <pre className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      {JSON.stringify(mcpConfig, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Message - morphs from the input during transition */}
        {isTransitioning && submittedPrompt && (
          <div className="absolute inset-0 flex flex-col pt-24 pb-24 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto px-4 animate-morphToMessage">
              <div className="bg-transparent rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC796B] to-[#D672EF] flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-black dark:text-white text-base">
                      {submittedPrompt}
                    </p>
                  </div>
                </div>
              </div>
              {/* Loading indicator */}
              <div className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-light-secondary dark:bg-dark-secondary flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/starknet_logo_grey.png"
                    alt="AI"
                    width={20}
                    height={20}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-[#EC796B] rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-[#D672EF] rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-[#EC796B] rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const FloatingIcons = ({ isAnimating }: { isAnimating: boolean }) => {
  const icons = [
    { id: 1, image: 'https://pbs.twimg.com/profile_images/1876581196173320192/pF4KQQCb_400x400.jpg', twitter: 'avnu', x: '15%', y: '20%', blur: 6, size: 82, delay: 0, floatAnim: 'animate-float1' },
    { id: 2, image: 'https://pbs.twimg.com/profile_images/1024585501901303808/m92jEcPI_400x400.jpg', twitter: 'Starknet', x: '75%', y: '15%', blur: 7, size: 95, delay: 0.2, floatAnim: 'animate-float2' },
    { id: 3, image: 'https://pbs.twimg.com/profile_images/1736767433635975168/G1H8l7Ci_400x400.jpg', twitter: 'myBraiinApp', x: '85%', y: '45%', blur: 8, size: 78, delay: 0.4, floatAnim: 'animate-float3' },
    { id: 4, image: 'https://pbs.twimg.com/profile_images/1846554119777013760/FydsgAUR_400x400.jpg', twitter: 'Ekubo', x: '20%', y: '70%', blur: 6, size: 100, delay: 0.1, floatAnim: 'animate-float4' },
    { id: 5, image: 'https://pbs.twimg.com/profile_images/1872475547059834880/TGT0jlCk_400x400.jpg', twitter: 'STRKfarm', x: '80%', y: '75%', blur: 9, size: 75, delay: 0.3, floatAnim: 'animate-float5' },
    { id: 6, image: 'https://pbs.twimg.com/profile_images/1899459698551562240/_WK4Lfeb_400x400.jpg', twitter: 'nostrafinance', x: '10%', y: '45%', blur: 7, size: 88, delay: 0.5, floatAnim: 'animate-float6' },
    { id: 7, image: 'https://pbs.twimg.com/profile_images/1676963409303322624/NuCcNNxa_400x400.png', twitter: 'argentHQ', x: '65%', y: '85%', blur: 8, size: 92, delay: 0.2, floatAnim: 'animate-float1' },
    { id: 8, image: 'https://pbs.twimg.com/profile_images/1782677936585256960/JAwtVCsD_400x400.png', twitter: 'Gizabotxyz', x: '30%', y: '12%', blur: 6, size: 80, delay: 0.4, floatAnim: 'animate-float2' },
    { id: 9, image: 'https://pbs.twimg.com/profile_images/1845153042762436629/LZs7_I2b_400x400.jpg', twitter: 'ZkLendxyz', x: '92%', y: '60%', blur: 7, size: 98, delay: 0.1, floatAnim: 'animate-float3' },
    { id: 10, image: 'https://pbs.twimg.com/profile_images/1845152900256829447/H6PRbeYs_400x400.jpg', twitter: 'nimbora_', x: '5%', y: '85%', blur: 9, size: 76, delay: 0.3, floatAnim: 'animate-float4' },
    { id: 11, image: 'https://pbs.twimg.com/profile_images/1854492998954012672/wcFszeR-_400x400.jpg', twitter: 'FinceptorA', x: '50%', y: '30%', blur: 6, size: 85, delay: 0.15, floatAnim: 'animate-float5' },
    { id: 12, image: 'https://pbs.twimg.com/profile_images/1635993072327639041/G_YIQ-G1_400x400.jpg', twitter: 'layerswap', x: '60%', y: '25%', blur: 7, size: 90, delay: 0.35, floatAnim: 'animate-float6' },
    { id: 13, image: 'https://pbs.twimg.com/profile_images/1940437227642798080/EnotVJl3_400x400.jpg', twitter: 'tradeparadex', x: '25%', y: '40%', blur: 8, size: 83, delay: 0.45, floatAnim: 'animate-float1' },
    { id: 14, image: 'https://pbs.twimg.com/profile_images/1686699616853454848/GMEuUL8M_400x400.jpg', twitter: 'FocusTree_', x: '40%', y: '55%', blur: 10, size: 78, delay: 0.25, floatAnim: 'animate-float2' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {icons.map((icon) => {
        return (
          <div
            key={icon.id}
            className={`absolute transition-all duration-700 ${
              isAnimating ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
            }`}
            style={{
              left: icon.x,
              top: icon.y,
              animationDelay: `${icon.delay}s`,
            }}
          >
            <a
              href={`https://twitter.com/${icon.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-full backdrop-blur-sm flex items-center justify-center shadow-xl transition-all duration-300 ${icon.floatAnim} overflow-hidden hover:scale-110 hover:shadow-2xl cursor-pointer block`}
              style={{
                width: `${icon.size}px`,
                height: `${icon.size}px`,
                animationDelay: `${icon.delay}s`,
                filter: `blur(${icon.blur}px)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'blur(0px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = `blur(${icon.blur}px)`;
              }}
            >
              <Image
                src={icon.image}
                alt="App logo"
                width={icon.size}
                height={icon.size}
                className="object-cover rounded-full"
              />
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default LandingPage;

