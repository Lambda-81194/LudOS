import React from 'react';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-[#ebdcd0] bg-[#fbf6f0] px-8 pb-6 pt-6 font-sans text-[#705e52] transition-colors duration-300 dark:border-[#4a3e47] dark:bg-[#241d20] dark:text-[#eadbd2]">
      {/* Top Bar Navigation */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left Side: Logo & Brand Name */}
        <div className="flex items-center gap-3">
          {/* Logo Icon Container */}
          <div className="w-9 h-9 rounded-lg bg-white border border-[#e8ded5] shadow-sm flex items-center justify-center p-1.5">
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
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-[#3b2e2b] dark:text-[#f6e9df]">
            Loadout
          </h1>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center space-x-8 text-sm font-normal text-[#938073] dark:text-[#c9ada1]">
          <a
            href="#explore"
            className="transition-colors duration-200 hover:text-[#3b2e2b] dark:hover:text-[#f6e9df]"
          >
            Explore
          </a>
          <a
            href="#saved"
            className="transition-colors duration-200 hover:text-[#3b2e2b] dark:hover:text-[#f6e9df]"
          >
            Saved
          </a>
          <a
            href="#how-it-works"
            className="transition-colors duration-200 hover:text-[#3b2e2b] dark:hover:text-[#f6e9df]"
          >
            How it works
          </a>
        </nav>

        {/* Right Side: Theme Toggle Switch */}
        <ThemeToggle />
      </div>

      {/* Subtitle / Description Section */}
      <div className="max-w-7xl mx-auto mt-6">
        <p className="max-w-xl text-sm font-normal leading-relaxed text-[#a89587] dark:text-[#c9ada1]">
          An assistant that turns a mood, a memory of a game you loved, or a spare twenty minutes into your next thing to play.
        </p>
      </div>
    </header>
  );
};

export default Header;