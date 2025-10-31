'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Popover, Transition } from '@headlessui/react';
import { useTheme } from 'next-themes';
import TextareaAutosize from 'react-textarea-autosize';
import {
  MCP_CLIENTS,
  generateMCPDeepLink,
  copyToClipboard,
  openDeepLink,
  type MCPStdioConfig,
} from '@/lib/mcpDeepLink';

type TabType = 'auto' | 'json';

const LandingPage = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('auto');
  const [selectedClient, setSelectedClient] = useState<string>('cursor');
  const [copied, setCopied] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate padding top based on screen size and config state
  const getPaddingTop = () => {
    if (showMCPConfig) {
      return activeTab === 'json' ? 'max(20vh, 100px)' : 'max(25vh, 120px)';
    }
    return isMobile ? 'max(25vh, 120px)' : 'calc(50vh - 100px)';
  };

  // MCP Configuration for Ask Starknet
  const mcpConfig: MCPStdioConfig = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@kasarlabs/ask-starknet-mcp'],
    env: {
      STARKNET_PUBLIC_ADDRESS: 'your-public-address-here',
      STARKNET_PRIVATE_KEY: 'your-private-key-here',
      STARKNET_RPC_URL: 'your-rpc-url-here',
      MODEL_API_KEY: 'your-model-api-key-here',
    },
  };

  const displayName = 'Ask Starknet MCP';
  const selectedClientInfo = MCP_CLIENTS.find((c) => c.id === selectedClient);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      setIsTransitioning(true);
      // Create a chat id and pass the initial message via sessionStorage
      setTimeout(() => {
        const id =
          globalThis.crypto && 'randomUUID' in globalThis.crypto
            ? (globalThis.crypto as Crypto).randomUUID()
            : Math.random().toString(36).slice(2);
        try {
          sessionStorage.setItem(`pendingPrompt:${id}`, prompt);
        } catch {}
        router.push(`/c/${id}`);
      }, 150);
    }
  };

  const handleChatClick = () => {
    // Trigger fade out animation before navigation
    setIsTransitioning(true);
    // Navigate to chat route after a short delay for smooth transition
    setTimeout(() => {
      router.push('/chat');
    }, 150);
  };

  const handleHistoryClick = () => {
    // Trigger fade out animation before navigation
    setIsTransitioning(true);
    // Navigate to history route after a short delay for smooth transition
    setTimeout(() => {
      router.push('/history');
    }, 150);
  };

  const handleMCPClick = () => {
    setShowMCPConfig(!showMCPConfig);
  };

  const handleCopyConfig = async () => {
    const configJson = JSON.stringify({ 'ask-starknet': mcpConfig }, null, 2);
    const success = await copyToClipboard(configJson);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOneClickSetup = () => {
    try {
      const deepLink = generateMCPDeepLink(
        selectedClient,
        displayName,
        mcpConfig,
        false,
      );
      openDeepLink(deepLink);
    } catch (err) {
      console.error('Failed to open deep link:', err);
    }
  };

  const handleLogoClick = () => {
    // Reset all states to initial landing page view
    setShowMCPConfig(false);
    setPrompt('');
    setActiveTab('auto');

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Navigate to home if not already there
    if (window.location.pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-light-primary dark:bg-dark-primary overflow-hidden">
      {/* Landing Page */}
      <div
        className={`h-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* Header with Logo */}
        <div
          className={`fixed transition-all duration-300 ease-out ${
            isTransitioning
              ? 'top-4 left-4 sm:top-8 sm:left-6 z-50 opacity-0'
              : 'top-4 left-4 sm:top-8 sm:left-8 z-50 opacity-100'
          }`}
        >
          <div className="relative flex items-center">
            {/* Logo - responsive size */}
            <button
              onClick={handleLogoClick}
              className={`transition-all duration-300 cursor-pointer hover:opacity-80 ${
                isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {/* Light mode logo */}
              <Image
                src="/ask_full_logo_black_alpha.png"
                alt="Ask Starknet Logo"
                width={120}
                height={40}
                className="object-contain dark:hidden w-[90px] h-[30px] sm:w-[120px] sm:h-[40px]"
              />
              {/* Dark mode logo */}
              <Image
                src="/ask_full_logo_white_alpha.png"
                alt="Ask Starknet Logo"
                width={120}
                height={40}
                className="object-contain hidden dark:block w-[90px] h-[30px] sm:w-[120px] sm:h-[40px]"
              />
            </button>
          </div>
        </div>

        {/* Action Buttons - top right - fade out smoothly */}
        <div
          className={`absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center space-x-3 sm:space-x-8 z-10 transition-all duration-200 ${
            isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            onClick={handleChatClick}
            className="text-black dark:text-white font-medium text-base sm:text-2xl hover:scale-105 transition-transform duration-200"
          >
            Chat
          </button>
          <button
            onClick={handleHistoryClick}
            className="text-black dark:text-white font-medium text-base sm:text-2xl hover:scale-105 transition-transform duration-200"
          >
            History
          </button>
          <button
            onClick={handleMCPClick}
            className="text-black dark:text-white font-medium text-base sm:text-2xl hover:scale-105 transition-transform duration-200"
          >
            Mcp
          </button>
          <button
            onClick={() => window.open('https://cairo-coder.com', '_blank')}
            className="text-black dark:text-white font-medium text-base sm:text-2xl hover:scale-105 transition-transform duration-200"
          >
            Coder
          </button>
        </div>

        {/* Landing Content - fades during transition */}
        <div
          className={`flex flex-col items-center h-full px-4 sm:px-6 md:px-8 transition-all duration-200 ${
            isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Floating Icons around the center - hidden on mobile */}
          <div className="hidden md:block">
            <FloatingIcons isAnimating={isTransitioning} />
          </div>

          {/* Centered Title and Input - title fixed, content grows below */}
          <div
            className="flex flex-col items-center w-full max-w-3xl mx-auto z-10 relative transition-all duration-700 mt-16 sm:mt-0"
            style={{
              paddingTop: getPaddingTop(),
            }}
          >
            {/* Title */}
            <div className="flex flex-col items-center justify-center space-y-2 mb-6 sm:mb-8 md:mb-12">
              <h1 className="text-black/70 dark:text-white/100 text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-center transition-all duration-500 px-4">
                {showMCPConfig
                  ? 'Build your own Starknet Agents'
                  : 'Unlock your Starknet expertise.'}
              </h1>
              {showMCPConfig && (
                <p className="text-black/60 dark:text-white/70 text-xs sm:text-sm md:text-base text-center max-w-2xl px-4">
                  Ask Starknet is available as a sophisticated MCP server.
                  Access hundreds of Starknet tools and agents via a single
                  ask_starknet method.
                </p>
              )}
            </div>

            {/* Search Input / MCP Config - with growing transition */}
            <div className="w-full overflow-visible">
              {/* Container that grows */}
              <div
                className={`w-full transition-all duration-700 ease-in-out overflow-visible ${
                  showMCPConfig
                    ? 'px-0 py-0 bg-transparent'
                    : isTransitioning
                      ? 'bg-transparent px-3 sm:px-5 pt-3 sm:pt-5 pb-2 rounded-lg'
                      : 'bg-light-secondary dark:bg-dark-secondary px-3 sm:px-5 pt-3 sm:pt-5 pb-2 rounded-lg'
                }`}
                style={{
                  minHeight: showMCPConfig
                    ? activeTab === 'json'
                      ? '500px'
                      : '250px'
                    : 'auto',
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
                  <form
                    onSubmit={handleSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Only Shift+Enter creates newline, all other combinations submit
                        if (e.shiftKey) {
                          // Allow default behavior (newline)
                          return;
                        }
                        // Plain Enter or Cmd/Ctrl/Alt+Enter submits
                        e.preventDefault();
                        if (prompt.trim().length === 0 || isTransitioning)
                          return;
                        handleSubmit(e);
                      }
                    }}
                    className="w-full"
                  >
                    <TextareaAutosize
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask anything..."
                      className="bg-transparent placeholder:text-black/50 dark:placeholder:text-white/50 text-base sm:text-lg text-black dark:text-white resize-none focus:outline-none w-full py-2 sm:py-3 max-h-48"
                      autoFocus={!showMCPConfig}
                      disabled={isTransitioning}
                      minRows={1}
                    />
                    <div className="flex flex-row items-center justify-end mt-3 sm:mt-4 relative z-50">
                      <button
                        type="submit"
                        disabled={!prompt.trim() || isTransitioning}
                        className="bg-transparent text-white disabled:text-gray-400 dark:disabled:text-gray-500 hover:scale-110 transition-all duration-200 rounded-full p-2"
                      >
                        <svg
                          className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]"
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

                {/* MCP Config Content - appears while container grows */}
                <div
                  className={`transition-all duration-700 ease-in-out ${
                    showMCPConfig
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-4 h-0 overflow-hidden pointer-events-none'
                  }`}
                >
                  {showMCPConfig && (
                    <div
                      className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 transition-all duration-500 ease-in-out overflow-visible"
                      style={{
                        minHeight: activeTab === 'json' ? '500px' : '200px',
                      }}
                    >
                      {/* Tabs */}
                      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-4 sm:pb-6">
                        <div className="flex gap-4 sm:gap-6 border-b border-light-200 dark:border-dark-200">
                          <button
                            onClick={() => setActiveTab('auto')}
                            className={`pb-2 sm:pb-3 px-1 font-medium text-sm sm:text-base transition-all duration-300 relative ${
                              activeTab === 'auto'
                                ? 'text-black dark:text-white'
                                : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              Auto
                            </span>
                            {activeTab === 'auto' && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white transition-all duration-300" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveTab('json')}
                            className={`pb-2 sm:pb-3 px-1 font-medium text-sm sm:text-base transition-all duration-300 relative ${
                              activeTab === 'json'
                                ? 'text-black dark:text-white'
                                : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              JSON
                            </span>
                            {activeTab === 'json' && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white transition-all duration-300" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content Container with relative positioning for absolute content */}
                      <div className="relative px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 overflow-visible">
                        {/* JSON Tab Content */}
                        <div
                          className={`transition-all duration-500 ease-in-out ${
                            activeTab === 'json'
                              ? 'opacity-100 translate-x-0 relative'
                              : 'opacity-0 -translate-x-4 absolute inset-0 pointer-events-none'
                          }`}
                        >
                          <div className="space-y-4 sm:space-y-6">
                            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60">
                              Add this configuration to any MCP client settings.
                            </p>

                            {/* JSON Config */}
                            <div className="bg-[#1a1a1a] rounded-lg overflow-hidden relative max-h-[60vh] overflow-y-auto">
                              <button
                                onClick={handleCopyConfig}
                                className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 p-1.5 sm:p-2 text-gray-400 hover:text-white hover:scale-110 rounded-lg transition-all"
                              >
                                {copied ? (
                                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                              </button>
                              <div className="px-3 sm:px-4 py-3 sm:py-4 overflow-x-auto pt-10 sm:pt-12">
                                <pre className="text-xs sm:text-sm font-mono leading-relaxed">
                                  <code>
                                    <span className="text-blue-400 font-semibold">
                                      &quot;ask-starknet&quot;
                                    </span>
                                    <span className="text-gray-400">
                                      : {'{'}
                                    </span>
                                    {'\n  '}
                                    <span className="text-purple-400">
                                      &quot;command&quot;
                                    </span>
                                    <span className="text-gray-400">: </span>
                                    <span className="text-green-400">
                                      &quot;{mcpConfig.command}&quot;
                                    </span>
                                    <span className="text-gray-400">,</span>
                                    {'\n  '}
                                    <span className="text-purple-400">
                                      &quot;args&quot;
                                    </span>
                                    <span className="text-gray-400">: [</span>
                                    {mcpConfig.args.map((arg, i) => (
                                      <span key={i}>
                                        {'\n    '}
                                        <span className="text-green-400">
                                          &quot;{arg}&quot;
                                        </span>
                                        {i < mcpConfig.args.length - 1 && (
                                          <span className="text-gray-400">
                                            ,
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                    {'\n  '}
                                    <span className="text-gray-400">],</span>
                                    {'\n  '}
                                    <span className="text-purple-400">
                                      &quot;env&quot;
                                    </span>
                                    <span className="text-gray-400">
                                      : {'{'}
                                    </span>
                                    {mcpConfig.env &&
                                      Object.entries(mcpConfig.env).map(
                                        ([key, value], i, arr) => (
                                          <span key={key}>
                                            {'\n    '}
                                            <span className="text-orange-400">
                                              &quot;{key}&quot;
                                            </span>
                                            <span className="text-gray-400">
                                              :{' '}
                                            </span>
                                            <span className="text-green-400">
                                              &quot;{value}&quot;
                                            </span>
                                            {i < arr.length - 1 && (
                                              <span className="text-gray-400">
                                                ,
                                              </span>
                                            )}
                                          </span>
                                        ),
                                      )}
                                    {'\n  '}
                                    <span className="text-gray-400">{'}'}</span>
                                    {'\n'}
                                    <span className="text-gray-400">{'}'}</span>
                                  </code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Auto Tab Content */}
                        <div
                          className={`transition-all duration-500 ease-in-out ${
                            activeTab === 'auto'
                              ? 'opacity-100 translate-x-0 relative overflow-visible'
                              : 'opacity-0 translate-x-4 absolute inset-0 pointer-events-none'
                          }`}
                        >
                          <div className="space-y-4 sm:space-y-6 overflow-visible">
                            {/* Client Dropdown and One-Click Install */}
                            <div>
                              <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 mb-3 sm:mb-4">
                                Connect this server to{' '}
                                {selectedClientInfo?.name} with one click.
                              </p>
                              <div className="flex items-center gap-2 sm:gap-3 relative z-[100]">
                                <Popover className="relative flex-1">
                                  {({ open }) => (
                                    <>
                                      <Popover.Button className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                          {selectedClientInfo?.icon && (
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 relative flex items-center justify-center">
                                              <Image
                                                src={selectedClientInfo.icon}
                                                alt={selectedClientInfo.name}
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                              />
                                            </div>
                                          )}
                                          <span className="font-medium text-sm sm:text-base text-black dark:text-white">
                                            {selectedClientInfo?.name}
                                          </span>
                                        </div>
                                        <ChevronDown
                                          className={`w-4 h-4 sm:w-5 sm:h-5 text-black/50 dark:text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
                                        />
                                      </Popover.Button>

                                      <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-150"
                                        enterFrom="opacity-0 translate-y-1"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                      >
                                        <Popover.Panel className="absolute z-[200] left-0 mt-2 w-full">
                                          <div className="bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg shadow-xl overflow-hidden">
                                            {MCP_CLIENTS.filter(
                                              (client) =>
                                                client.id !== selectedClient,
                                            ).map((client) => (
                                              <Popover.Button
                                                key={client.id}
                                                onClick={() =>
                                                  setSelectedClient(client.id)
                                                }
                                                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                                              >
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 relative flex items-center justify-center">
                                                  <Image
                                                    src={client.icon}
                                                    alt={client.name}
                                                    width={24}
                                                    height={24}
                                                    className="object-contain"
                                                  />
                                                </div>
                                                <span className="font-medium text-sm sm:text-base text-black dark:text-white">
                                                  {client.name}
                                                </span>
                                              </Popover.Button>
                                            ))}
                                          </div>
                                        </Popover.Panel>
                                      </Transition>
                                    </>
                                  )}
                                </Popover>

                                {/* One-Click Install Icon */}
                                <button
                                  onClick={handleOneClickSetup}
                                  className="p-3 sm:p-4 text-white rounded-lg transition-transform hover:scale-110"
                                  title="One-Click Install"
                                >
                                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FloatingIcons = ({ isAnimating }: { isAnimating?: boolean }) => {
  const icons = [
    {
      id: 1,
      image:
        'https://pbs.twimg.com/profile_images/1876581196173320192/pF4KQQCb_400x400.jpg',
      twitter: 'extendedapp',
      x: '15%',
      y: '20%',
      blur: 6,
      size: 82,
      mobileSize: 60,
      delay: 0,
      floatAnim: 'animate-float1',
    },
    {
      id: 2,
      image:
        'https://pbs.twimg.com/profile_images/1024585501901303808/m92jEcPI_400x400.jpg',
      twitter: 'ready_co',
      x: '75%',
      y: '15%',
      blur: 7,
      size: 95,
      mobileSize: 70,
      delay: 0.2,
      floatAnim: 'animate-float2',
    },
    {
      id: 3,
      image:
        'https://pbs.twimg.com/profile_images/1736767433635975168/G1H8l7Ci_400x400.jpg',
      twitter: 'avnu_fi',
      x: '85%',
      y: '45%',
      blur: 8,
      size: 78,
      mobileSize: 56,
      delay: 0.4,
      floatAnim: 'animate-float3',
    },
    {
      id: 4,
      image:
        'https://pbs.twimg.com/profile_images/1846554119777013760/FydsgAUR_400x400.jpg',
      twitter: 'myBraavos',
      x: '20%',
      y: '70%',
      blur: 6,
      size: 100,
      mobileSize: 72,
      delay: 0.1,
      floatAnim: 'animate-float4',
    },
    {
      id: 5,
      image:
        'https://pbs.twimg.com/profile_images/1872475547059834880/TGT0jlCk_400x400.jpg',
      twitter: 'XverseApp',
      x: '80%',
      y: '75%',
      blur: 9,
      size: 75,
      mobileSize: 54,
      delay: 0.3,
      floatAnim: 'animate-float5',
    },
    {
      id: 6,
      image:
        'https://pbs.twimg.com/profile_images/1899459698551562240/_WK4Lfeb_400x400.jpg',
      twitter: 'vesuxyz',
      x: '10%',
      y: '45%',
      blur: 7,
      size: 88,
      mobileSize: 64,
      delay: 0.5,
      floatAnim: 'animate-float6',
    },
    {
      id: 7,
      image:
        'https://pbs.twimg.com/profile_images/1676963409303322624/NuCcNNxa_400x400.png',
      twitter: 'EkuboProtocol',
      x: '65%',
      y: '85%',
      blur: 8,
      size: 92,
      mobileSize: 66,
      delay: 0.2,
      floatAnim: 'animate-float1',
    },
    {
      id: 8,
      image:
        'https://pbs.twimg.com/profile_images/1782677936585256960/JAwtVCsD_400x400.png',
      twitter: 'cairolang',
      x: '30%',
      y: '12%',
      blur: 6,
      size: 80,
      mobileSize: 58,
      delay: 0.4,
      floatAnim: 'animate-float2',
    },
    {
      id: 9,
      image:
        'https://pbs.twimg.com/profile_images/1845153042762436629/LZs7_I2b_400x400.jpg',
      twitter: 'cartridge_gg',
      x: '92%',
      y: '60%',
      blur: 7,
      size: 98,
      mobileSize: 70,
      delay: 0.1,
      floatAnim: 'animate-float3',
    },
    {
      id: 10,
      image:
        'https://pbs.twimg.com/profile_images/1845152900256829447/H6PRbeYs_400x400.jpg',
      twitter: 'ohayo_dojo',
      x: '5%',
      y: '85%',
      blur: 9,
      size: 76,
      mobileSize: 55,
      delay: 0.3,
      floatAnim: 'animate-float4',
    },
    {
      id: 11,
      image:
        'https://pbs.twimg.com/profile_images/1854492998954012672/wcFszeR-_400x400.jpg',
      twitter: 'endurfi',
      x: '50%',
      y: '30%',
      blur: 6,
      size: 85,
      mobileSize: 62,
      delay: 0.15,
      floatAnim: 'animate-float5',
    },
    {
      id: 12,
      image:
        'https://pbs.twimg.com/profile_images/1635993072327639041/G_YIQ-G1_400x400.jpg',
      twitter: 'layerswap',
      x: '60%',
      y: '25%',
      blur: 7,
      size: 90,
      mobileSize: 65,
      delay: 0.35,
      floatAnim: 'animate-float6',
    },
    {
      id: 13,
      image:
        'https://pbs.twimg.com/profile_images/1940437227642798080/EnotVJl3_400x400.jpg',
      twitter: 'tradeparadex',
      x: '25%',
      y: '40%',
      blur: 8,
      size: 83,
      mobileSize: 60,
      delay: 0.45,
      floatAnim: 'animate-float1',
    },
    {
      id: 14,
      image:
        'https://pbs.twimg.com/profile_images/1686699616853454848/GMEuUL8M_400x400.jpg',
      twitter: 'FocusTree_',
      x: '40%',
      y: '55%',
      blur: 10,
      size: 78,
      mobileSize: 56,
      delay: 0.25,
      floatAnim: 'animate-float2',
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {icons.map((icon) => {
        return (
          <div
            key={icon.id}
            className={`absolute transition-all duration-200 ${
              isAnimating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
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
