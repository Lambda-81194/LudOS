interface PromptPillProps {
  label: string;
  onClick: (label: string) => void;
}

export const PromptPill: React.FC<PromptPillProps> = ({
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className="rounded-full border border-[#ebdcd0] bg-white px-4 py-2 text-sm font-medium text-[#705e52] transition-all duration-200 hover:border-[#e08ba2] hover:bg-[#e08ba2] hover:text-white sm:px-5 dark:border-[#4a3e47] dark:bg-[#2d222a] dark:text-[#eadbd2] dark:hover:border-[#e08ba2] dark:hover:bg-[#e08ba2] dark:hover:text-white"
    >
      {label}
    </button>
  );
};