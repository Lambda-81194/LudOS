import React from 'react';

interface ShortcutCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  iconClassName?: string;
  iconBackgroundClassName?: string;
}

export const ShortcutCard: React.FC<ShortcutCardProps> = ({
  icon,
  title,
  description,
  onClick,
  iconClassName = 'text-[#b95878] dark:text-[#f2a5bf]',
  iconBackgroundClassName = 'bg-[#f5d6df] dark:bg-[#523342]',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col items-start rounded-2xl border border-[#ead8c9] bg-[#fffaf6] p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[#e7a2b7] hover:bg-[#fffdfb] dark:border-[#665365] dark:bg-[#30262e] dark:hover:border-[#a9778d] dark:hover:bg-[#3a2d38]"
    >
      <div className={`mb-3 rounded-xl p-2 transition-transform duration-200 group-hover:scale-110 ${iconBackgroundClassName} ${iconClassName}`}>
        {icon}
      </div>
      <h3 className="mb-1 text-base font-semibold text-[#603f2d] dark:text-[#f6e9df]">{title}</h3>
      <p className="text-sm font-normal leading-relaxed text-[#a9826f] dark:text-[#c9ada1]">
        {description}
      </p>
    </button>
  );
};