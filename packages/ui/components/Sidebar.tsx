/* eslint-disable @next/next/no-img-element */
'use client';

import { cn } from '@/lib/utils';
import {
  BookOpenText,
  SquarePen,
  Settings,
  Home,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import React, { useState, type ReactNode } from 'react';
import Layout from './Layout';
import Image from 'next/image';
import { useTheme } from 'next-themes';

const VerticalIconContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col items-center gap-y-3 w-full">{children}</div>
  );
};

const Sidebar = ({
  children,
  onLogoClick,
}: {
  children: React.ReactNode;
  onLogoClick?: () => void;
}) => {
  const segments = useSelectedLayoutSegments();
  const { theme, setTheme } = useTheme();

  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const navLinks = [
    {
      icon: SquarePen,
      href: '/chat',
      active: segments.includes('chat') || segments.includes('c'),
      label: 'Chat',
    },
    {
      icon: BookOpenText,
      href: '/history',
      active: segments.includes('history'),
      label: 'History',
    },
    {
      icon: Home,
      href: '/',
      active: segments.length === 0,
      label: 'Home',
    },
  ];

  return (
    <div>
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-[100] lg:flex lg:w-20 lg:flex-col animate-slideInLeft">
        <div className="flex grow flex-col items-center justify-between gap-y-5 overflow-y-auto bg-light-primary dark:bg-dark-primary px-2 py-8">
          {onLogoClick ? (
            <button
              onClick={onLogoClick}
              className="transition-transform hover:scale-105 duration-200"
            >
              <Image
                src="/ask_logo_black_alpha.png"
                alt="Ask Logo"
                width={35}
                height={35}
                className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-200 dark:hidden"
              />
              <Image
                src="/ask_logo_white_alpha.png"
                alt="Ask Logo"
                width={35}
                height={35}
                className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-200 hidden dark:block"
              />
            </button>
          ) : (
            <Link
              href="/"
              className="transition-transform hover:scale-105 duration-200"
            >
              <Image
                src="/ask_logo_black_alpha.png"
                alt="Ask Logo"
                width={35}
                height={35}
                className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-200 dark:hidden"
              />
              <Image
                src="/ask_logo_white_alpha.png"
                alt="Ask Logo"
                width={35}
                height={35}
                className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-200 hidden dark:block"
              />
            </Link>
          )}
          <div className="flex-1" />
          <VerticalIconContainer>
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={cn(
                  'relative flex flex-row items-center justify-center cursor-pointer hover:scale-110 duration-200 transition-transform w-full py-2 rounded-lg',
                  link.active
                    ? 'text-black dark:text-white'
                    : 'text-black/70 dark:text-white/70',
                )}
              >
                <link.icon />
              </Link>
            ))}

            {/* Theme Picker Section */}
            <div className="relative w-full flex flex-row items-center justify-center">
              <div
                onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                className="cursor-pointer flex flex-row items-center justify-center hover:scale-110 duration-200 transition-transform w-full py-2 rounded-lg text-black/70 dark:text-white/70"
              >
                <Settings />
              </div>
            </div>
          </VerticalIconContainer>

          {/* Theme Icons Slide-out - positioned next to Settings icon */}
          {isThemePickerOpen && (
            <div className="fixed left-[88px] bottom-8 flex flex-row gap-2 bg-light-secondary dark:bg-dark-secondary rounded-lg px-2 py-2 border border-light-200 dark:border-dark-200 shadow-lg animate-slideInLeft z-[150]">
              <button
                onClick={() => {
                  setTheme('light');
                  setIsThemePickerOpen(false);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  theme === 'light'
                    ? 'text-black dark:text-white scale-110'
                    : 'text-black/70 dark:text-white/70 hover:scale-110',
                )}
                title="Light mode"
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setIsThemePickerOpen(false);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  theme === 'dark'
                    ? 'text-black dark:text-white scale-110'
                    : 'text-black/70 dark:text-white/70 hover:scale-110',
                )}
                title="Dark mode"
              >
                <Moon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setIsThemePickerOpen(false);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  theme === 'system'
                    ? 'text-black dark:text-white scale-110'
                    : 'text-black/70 dark:text-white/70 hover:scale-110',
                )}
                title="System mode"
              >
                <Monitor className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 w-full z-50 flex flex-row items-center gap-x-4 sm:gap-x-6 bg-light-primary dark:bg-dark-primary px-3 sm:px-4 py-3 sm:py-4 shadow-sm lg:hidden animate-slideInBottom border-t border-light-100 dark:border-dark-200">
        {navLinks.map((link, i) => (
          <Link
            href={link.href}
            key={i}
            className={cn(
              'relative flex flex-col items-center space-y-0.5 sm:space-y-1 text-center w-full',
              link.active
                ? 'text-black dark:text-white'
                : 'text-black/70 dark:text-white/70',
            )}
          >
            <link.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <p className="text-[10px] sm:text-xs">{link.label}</p>
          </Link>
        ))}
      </div>

      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
