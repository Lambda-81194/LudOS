import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9ab3] focus-visible:ring-offset-2 ${
        isDark ? 'bg-[#4a3e47]' : 'bg-[#ebdcd0]'
      }`}
    >
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-transform duration-300 ${
          isDark ? 'translate-x-6 bg-[#2d222a]' : 'translate-x-0 bg-white'
        }`}
      >
        {isDark ? (
          <MoonIcon className="h-4 w-4 text-emerald-300 transition-all duration-300" />
        ) : (
          <SunIcon className="h-4 w-4 text-amber-500 transition-all duration-300" />
        )}
      </div>
    </button>
  );
};