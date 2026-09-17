import { useState } from 'react'
import type { FormEvent } from 'react'
import PaperAirplaneIcon from '@heroicons/react/24/solid/PaperAirplaneIcon'

const MAX_LENGTH = 500

type ChatInputProps = {
	onSend?: (message: string) => void
	value?: string
	onChange?: (message: string) => void
}

export default function ChatInput({ onSend, value, onChange }: ChatInputProps) {
	const [internalMessage, setInternalMessage] = useState('')
	const message = value ?? internalMessage

	function updateMessage(nextMessage: string) {
		if (value === undefined) setInternalMessage(nextMessage)
		onChange?.(nextMessage)
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const trimmedMessage = message.trim()

		if (!trimmedMessage) return

		onSend?.(trimmedMessage)
		updateMessage('')
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex w-full max-w-2xl items-center gap-3 rounded-[1.75rem] border border-[#ead8c9] bg-[#fffdfb] p-2 pl-6 shadow-[0_8px_24px_rgba(117,76,49,0.08)] transition-colors duration-300 dark:border-[#4a3e47] dark:bg-[#2d222a]"
		>
			<label htmlFor="chat-message" className="sr-only">
				Message
			</label>
			<textarea
				id="chat-message"
				value={message}
				maxLength={MAX_LENGTH}
				onChange={(event) => updateMessage(event.target.value)}
				placeholder='e.g. “something cozy I can play in short bursts”'
				rows={1}
				className="min-w-0 flex-1 resize-none border-0 bg-transparent py-3 text-base text-[#6f5547] outline-none placeholder:text-[#a9826f] dark:text-[#eadbd2] dark:placeholder:text-[#c9ada1]"
			/>
			<button
				type="submit"
				disabled={!message.trim()}
				aria-label="Send message"
				title="Send message"
				className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f19ab4] text-[#603447] transition-colors hover:bg-[#ed88a7] disabled:cursor-not-allowed disabled:bg-[#f3c4d1] disabled:text-[#a88491]"
			>
				<PaperAirplaneIcon className="size-5" aria-hidden="true" />
			</button>
		</form>
	)
}
