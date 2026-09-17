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
		<div className="mx-auto w-full">
			<form
				onSubmit={handleSubmit}
				className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-[1.5rem] border border-[#ead8c9] bg-[#fffdfb] p-1.5 pl-4 shadow-[0_8px_24px_rgba(117,76,49,0.08)] transition-colors duration-300 sm:gap-3 sm:rounded-[1.75rem] sm:p-2 sm:pl-6 dark:border-[#4a3e47] dark:bg-[#2d222a]"
			>
				<label htmlFor="chat-message" className="sr-only">
					Message
				</label>
				<textarea
					id="chat-message"
					value={message}
					maxLength={MAX_LENGTH}
					onChange={(event) => updateMessage(event.target.value)}
					placeholder='e.g. “something cozy for short bursts”'
					rows={1}
					className="min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm text-[#6f5547] outline-none placeholder:text-[#a9826f] sm:py-3 sm:text-base dark:text-[#eadbd2] dark:placeholder:text-[#c9ada1]"
				/>
				<button
					type="submit"
					disabled={!message.trim()}
					aria-label="Send message"
					title="Send message"
					className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f19ab4] text-[#603447] transition-colors hover:bg-[#ed88a7] sm:size-12 disabled:cursor-not-allowed disabled:bg-[#f3c4d1] disabled:text-[#a88491]"
				>
					<PaperAirplaneIcon className="size-5" aria-hidden="true" />
				</button>
			</form>
			<p className="mt-3 px-4 text-center text-xs leading-relaxed text-[#a9826f] dark:text-[#c9ada1]">
				Recommendations only, not a storefront. It won't know about anything released this week.
			</p>
		</div>
	)
}
