type ChatMessageProps = {
	role: 'user' | 'model'
	text: string
}

export default function ChatMessage({ role, text }: ChatMessageProps) {
	const isUser = role === 'user'

	return (
		<div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 text-left text-sm leading-relaxed sm:max-w-[75%] sm:text-base ${
					isUser
						? 'rounded-br-md bg-[#f19ab4] text-[#603447]'
						: 'rounded-bl-md border border-[#ead8c9] bg-[#f5e9df] text-[#6f5547] dark:border-[#665365] dark:bg-[#4c3d4e] dark:text-[#eadbd2]'
				}`}
			>
				{text}
			</div>
		</div>
	)
}