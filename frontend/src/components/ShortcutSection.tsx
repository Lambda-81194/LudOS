import React from 'react';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ShortcutCard } from './ShortcutCard';

interface ShortcutSectionProps {
  onSelectShortcut: (prompt: string) => void;
}

export const ShortcutSection: React.FC<ShortcutSectionProps> = ({ onSelectShortcut }) => {
  return (
    <section className="mx-auto mt-12 w-full max-w-7xl border-t border-[#ead8c9] pt-8 text-left dark:border-[#4a3e47] sm:mt-16 sm:pt-10">
      <h2 className="mb-5 font-serif text-2xl font-semibold text-[#603f2d] dark:text-[#f6e9df] sm:text-3xl">
        Quick modes
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ShortcutCard
          icon={<SparklesIcon className="size-5" />}
          title="Surprise me"
          description="Skip the questions, get one great pick right now."
          iconClassName="text-[#b45309] dark:text-[#fbbf24]"
          iconBackgroundClassName="bg-[#fef0c7] dark:bg-[#5a3d18]"
          onClick={() => onSelectShortcut('Surprise me with a great game')}
        />
        <ShortcutCard
          icon={<ArrowPathIcon className="size-5" />}
          title="More like a game I loved"
          description="Name a favorite and get its closest cousins."
          iconClassName="text-[#087ea4] dark:text-[#67e8f9]"
          iconBackgroundClassName="bg-[#d5f3fa] dark:bg-[#164553]"
          onClick={() => onSelectShortcut('Find games similar to a favorite')}
        />
      </div>
    </section>
  );
};