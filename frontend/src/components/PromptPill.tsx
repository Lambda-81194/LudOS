interface PromptPillProps {
  label: string;
  isSelected?: boolean;
  onClick: (label: string) => void;
}

export const PromptPill: React.FC<PromptPillProps> = ({
  label,
  isSelected = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
        isSelected
          ? 'bg-[#e08ba2] text-white border-[#e08ba2] shadow-sm'
          : 'bg-white text-[#705e52] border-[#ebdcd0] hover:border-[#d4c1b2] dark:bg-[#2d222a] dark:text-[#eadbd2] dark:border-[#4a3e47] dark:hover:border-[#7a5d68]'
      }`}
    >
      {label}
    </button>
  );
};