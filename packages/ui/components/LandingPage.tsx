'use client';

import { useState, Fragment, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Focus from './MessageInputActions/Focus';
import { ArrowRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Popover, Transition } from '@headlessui/react';
import {
  MCP_CLIENTS,
  generateMCPDeepLink,
  copyToClipboard,
  openDeepLink,
  type MCPStdioConfig,
} from '@/lib/mcpDeepLink';
import ChatWindow from './ChatWindow';
import Sidebar from './Sidebar';

// Dynamically import the FalconViewer to avoid SSR issues with Three.js
const FalconViewer = dynamic(() => import('./FalconViewer'), {
  ssr: false,
});

type TabType = 'auto' | 'json';

const LandingPage = () => {
  const [prompt, setPrompt] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [focusMode, setFocusMode] = useState('starknetEcosystemSearch');
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [isCoderHovered, setIsCoderHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('auto');
  const [selectedClient, setSelectedClient] = useState<string>('cursor');
  const [copied, setCopied] = useState<boolean>(false);

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
      setInitialPrompt(prompt);
      // Start sidebar transition immediately for seamless animation
      setShowChat(true);
    }
  };

  const handleChatClick = () => {
    setIsTransitioning(true);
    // Start sidebar transition immediately for seamless animation
    setShowChat(true);
  };

  const handleBackToLanding = () => {
    setShowChat(false);
    setIsTransitioning(false);
    setInitialPrompt('');
    setPrompt('');
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
      const deepLink = generateMCPDeepLink(selectedClient, displayName, mcpConfig, false);
      openDeepLink(deepLink);
    } catch (err) {
      console.error('Failed to open deep link:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-light-primary dark:bg-dark-primary overflow-hidden">
      {/* Chat View - Hidden until showChat is true */}
      {showChat && (
        <Sidebar onLogoClick={handleBackToLanding}>
          <ChatWindow 
            key={initialPrompt} 
            initialMessage={initialPrompt}
            focusMode={focusMode}
            onBack={handleBackToLanding}
          />
        </Sidebar>
      )}

      {/* Landing Page - Fades out when showChat is true */}
      <div className={`h-full transition-opacity duration-600 ${showChat ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Header with Logo - special transition animation */}
        <div 
          className={`fixed transition-all duration-600 ease-out ${
            showChat 
              ? 'top-8 left-6 z-0 opacity-0' 
              : isTransitioning 
                ? 'top-8 left-6 z-50 opacity-100' 
                : 'top-8 left-8 z-50 opacity-100'
          }`}
        >
          <div className="relative flex items-center">
            {/* Full logo */}
            <div
              className={`transition-all duration-300 ${
                showChat || isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              <Image
                src="/ask_full_logo_white_alpha.png"
                alt="Ask Starknet Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - top right - fade out smoothly */}
        <div
          className={`absolute top-8 right-8 flex items-center space-x-8 z-10 transition-all duration-500 ${
            isTransitioning || showChat ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
            onMouseEnter={() => setIsCoderHovered(true)}
            onMouseLeave={() => setIsCoderHovered(false)}
            className="relative text-black dark:text-white font-medium text-2xl hover:scale-105 transition-all duration-300"
          >
            <span className={`transition-opacity duration-300 ${isCoderHovered ? 'opacity-0' : 'opacity-100'}`}>
              Coder
            </span>
            {isCoderHovered && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] pointer-events-none border-2 border-red-500">
                <FalconViewer
                  modelPath="/models/Falcon.glb"
                  width={200}
                  height={200}
                  autoRotate={true}
                  enableControls={false}
                />
              </div>
            )}
          </button>
        </div>

        {/* Landing Content - fades during transition */}
        <div
          className={`flex flex-col items-center h-full px-4 sm:px-8 transition-all duration-500 ${
            isTransitioning || showChat
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100'
          }`}
        >
          {/* Floating Icons around the center */}
          <FloatingIcons isAnimating={isTransitioning || showChat} />

          {/* Centered Title and Input - title fixed, content grows below */}
          <div 
            className="flex flex-col items-center w-full max-w-3xl mx-auto z-10 relative transition-all duration-700" 
            style={{ 
              paddingTop: showMCPConfig 
                ? (activeTab === 'json' ? 'calc(50vh - 280px)' : 'calc(50vh - 200px)') 
                : 'calc(50vh - 100px)' 
            }}
          >
            {/* Title */}
            <div className="flex flex-col items-center justify-center space-y-2 mb-12">
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
            <div className="w-full overflow-visible">
              {/* Container that grows */}
              <div
                className={`w-full transition-all duration-700 ease-in-out overflow-visible ${
                  showMCPConfig
                    ? 'px-0 py-0 bg-transparent'
                    : isTransitioning
                    ? 'bg-transparent px-5 pt-5 pb-2 rounded-lg'
                    : 'bg-light-secondary dark:bg-dark-secondary px-5 pt-5 pb-2 rounded-lg'
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
                        minHeight: activeTab === 'json' ? '600px' : '350px',
                      }}
                    >
                      {/* Tabs */}
                      <div className="px-8 pt-6 pb-6">
                        <div className="flex gap-6 border-b border-light-200 dark:border-dark-200">
                          <button
                            onClick={() => setActiveTab('auto')}
                            className={`pb-3 px-1 font-medium transition-all duration-300 relative ${
                              activeTab === 'auto'
                                ? 'text-white'
                                : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                          >
                            <span className="flex items-center gap-2">Auto</span>
                            {activeTab === 'auto' && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white transition-all duration-300" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveTab('json')}
                            className={`pb-3 px-1 font-medium transition-all duration-300 relative ${
                              activeTab === 'json'
                                ? 'text-white'
                                : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                            }`}
                          >
                            <span className="flex items-center gap-2">JSON</span>
                            {activeTab === 'json' && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white transition-all duration-300" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content Container with relative positioning for absolute content */}
                      <div className="relative px-8 pb-8 overflow-visible">
                        {/* JSON Tab Content */}
                        <div
                          className={`transition-all duration-500 ease-in-out ${
                            activeTab === 'json'
                              ? 'opacity-100 translate-x-0 relative'
                              : 'opacity-0 -translate-x-4 absolute inset-0 pointer-events-none'
                          }`}
                        >
                          <div className="space-y-6">
                            <p className="text-sm text-black/60 dark:text-white/60">
                              Add this configuration to any MCP client settings.
                            </p>

                            {/* JSON Config */}
                            <div className="bg-[#1a1a1a] rounded-lg overflow-hidden relative">
                              <button
                                onClick={handleCopyConfig}
                                className="absolute top-3 right-3 z-10 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                {copied ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <div className="px-4 py-4 overflow-x-auto pt-12">
                                <pre className="text-sm font-mono leading-relaxed">
                                  <code>
                                    <span className="text-gray-400">{'{'}</span>
                                    {'\n  '}
                                    <span className="text-blue-400 font-semibold">
                                      &quot;mcpServers&quot;
                                    </span>
                                    <span className="text-gray-400">: {'{'}</span>
                                    {'\n    '}
                                    <span className="text-blue-400 font-semibold">
                                      &quot;ask-starknet&quot;
                                    </span>
                                    <span className="text-gray-400">: {'{'}</span>
                                    {'\n      '}
                                    <span className="text-purple-400">&quot;command&quot;</span>
                                    <span className="text-gray-400">: </span>
                                    <span className="text-green-400">
                                      &quot;{mcpConfig.command}&quot;
                                    </span>
                                    <span className="text-gray-400">,</span>
                                    {'\n      '}
                                    <span className="text-purple-400">&quot;args&quot;</span>
                                    <span className="text-gray-400">: [</span>
                                    {mcpConfig.args.map((arg, i) => (
                                      <span key={i}>
                                        {'\n        '}
                                        <span className="text-green-400">&quot;{arg}&quot;</span>
                                        {i < mcpConfig.args.length - 1 && (
                                          <span className="text-gray-400">,</span>
                                        )}
                                      </span>
                                    ))}
                                    {'\n      '}
                                    <span className="text-gray-400">],</span>
                                    {'\n      '}
                                    <span className="text-purple-400">&quot;env&quot;</span>
                                    <span className="text-gray-400">: {'{'}</span>
                                    {mcpConfig.env &&
                                      Object.entries(mcpConfig.env).map(([key, value], i, arr) => (
                                        <span key={key}>
                                          {'\n        '}
                                          <span className="text-orange-400">
                                            &quot;{key}&quot;
                                          </span>
                                          <span className="text-gray-400">: </span>
                                          <span className="text-green-400">
                                            &quot;{value}&quot;
                                          </span>
                                          {i < arr.length - 1 && (
                                            <span className="text-gray-400">,</span>
                                          )}
                                        </span>
                                      ))}
                                    {'\n      '}
                                    <span className="text-gray-400">{'}'}</span>
                                    {'\n    '}
                                    <span className="text-gray-400">{'}'}</span>
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
                          <div className="space-y-6 overflow-visible">
                            {/* Client Dropdown and One-Click Install */}
                            <div>
                              <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                                Connect this server to {selectedClientInfo?.name} with one click.
                              </p>
                              <div className="flex items-center gap-3">
                                <Popover className="relative flex-1">
                                  <Popover.Button className="w-full flex items-center justify-between px-4 py-3 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                      {selectedClientInfo?.icon && (
                                        <div className="w-6 h-6 relative flex items-center justify-center">
                                          <Image
                                            src={selectedClientInfo.icon}
                                            alt={selectedClientInfo.name}
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                          />
                                        </div>
                                      )}
                                      <span className="font-medium text-black dark:text-white">
                                        {selectedClientInfo?.name}
                                      </span>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-black/50 dark:text-white/50 transition-transform ui-open:rotate-180" />
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
                                    <Popover.Panel className="absolute z-50 left-0 mt-2 w-full">
                                      <div className="bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg shadow-xl overflow-hidden">
                                        {MCP_CLIENTS.map((client) => (
                                          <Popover.Button
                                            key={client.id}
                                            onClick={() => setSelectedClient(client.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-light-200 dark:hover:bg-dark-200 transition-colors ${
                                              selectedClient === client.id
                                                ? 'bg-light-200 dark:bg-dark-200'
                                                : ''
                                            }`}
                                          >
                                            <div className="w-6 h-6 relative flex items-center justify-center">
                                              <Image
                                                src={client.icon}
                                                alt={client.name}
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                              />
                                            </div>
                                            <span className="font-medium text-black dark:text-white">
                                              {client.name}
                                            </span>
                                          </Popover.Button>
                                        ))}
                                      </div>
                                    </Popover.Panel>
                                  </Transition>
                                </Popover>

                                {/* One-Click Install Icon */}
                                <button
                                  onClick={handleOneClickSetup}
                                  className="p-4 text-white rounded-lg transition-transform hover:scale-110"
                                  title="One-Click Install"
                                >
                                  <ArrowRight className="w-6 h-6" />
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
            className={`absolute transition-all duration-500 ${
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

