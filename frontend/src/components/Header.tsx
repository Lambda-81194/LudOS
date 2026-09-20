import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import { ThemeToggle } from './ThemeToggle';

type HeaderProps = {
  onNewChat: () => void;
  disabled?: boolean;
};

export const Header: React.FC<HeaderProps> = ({ onNewChat, disabled = false }) => {
  return (
    <header className="relative isolate sticky top-0 z-50 w-full overflow-hidden border-b border-[#ebdcd0] bg-[#fbf6f0]/95 px-4 pb-4 pt-4 font-sans text-[#705e52] backdrop-blur-md transition-colors duration-300 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8 lg:pb-6 lg:pt-6 dark:border-[#4a3e47] dark:bg-[#241d20]/95 dark:text-[#eadbd2]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_12%_0%,rgba(238,154,179,0.2),transparent_38%),radial-gradient(ellipse_at_80%_0%,rgba(126,197,211,0.18),transparent_42%)] dark:bg-[radial-gradient(ellipse_at_12%_0%,rgba(238,154,179,0.22),transparent_38%),radial-gradient(ellipse_at_80%_0%,rgba(126,197,211,0.22),transparent_42%)]"
      />
      {/* Top Bar Navigation */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4">
        
        {/* Left Side: Logo & Brand Name */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Logo Icon Container */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e8ded5] bg-white p-1.5 shadow-sm">
            {/* Diamond SVG Icon */}
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 12L12 22L22 12L12 2Z"
                fill="url(#diamondGradient)"
              />
              <defs>
                <linearGradient
                  id="diamondGradient"
                  x1="2"
                  y1="2"
                  x2="22"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#e879f9" />
                  <stop offset="50%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Title */}
          <h1 className="truncate text-xl font-serif font-semibold tracking-tight text-[#3b2e2b] sm:text-2xl dark:text-[#f6e9df]">
            LudOS
          </h1>
        </div>
        {/* Right Side: New Chat and Theme Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onNewChat}
            disabled={disabled}
            aria-label="Start a new chat"
            title="New chat"
            className="flex items-center gap-1.5 rounded-full border border-[#ead8c9] px-3 py-2 text-xs font-semibold text-[#8f6e61] transition-colors hover:border-[#e08ba2] hover:bg-[#f5e9df] hover:text-[#b95878] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#665365] dark:text-[#c9ada1] dark:hover:border-[#e08ba2] dark:hover:bg-[#4c3d4e] dark:hover:text-[#f2a5bf]"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            <span>New chat</span>
          </button>
          <ThemeToggle />
        </div>

      </div>

      {/* Subtitle / Description Section */}
      <div className="relative z-10 mx-auto mt-4 flex max-w-7xl items-start gap-3 rounded-2xl border border-[#ead8c9] bg-[#f5e9df]/90 px-4 py-3 transition-colors duration-300 sm:mt-6 sm:items-center sm:gap-4 sm:px-5 sm:py-4 dark:border-[#665365] dark:bg-[#4c3d4e]/90">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e5aa45] text-[#553c1f] sm:mt-0 dark:bg-[#e5aa45]">
          <SparklesIcon className="size-4" aria-hidden="true" />
        </div>
        <p className="min-w-0 flex-1 text-sm font-normal leading-relaxed text-[#8f6e61] sm:text-base dark:text-[#e8c8dc]">
          An assistant that turns a mood, a memory of a game you loved, or the time you're willing to invest into your next thing to play.

        </p>
      </div>
    </header>
  );
};

export default Header;