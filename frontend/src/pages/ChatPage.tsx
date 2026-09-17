import { useState } from 'react'
import ChatInput from '../components/ChatInput'
import Header from '../components/Header'
import { PromptPill } from '../components/PromptPill'
import { ShortcutSection } from '../components/ShortcutSection'

const prompts = ['Chill', 'Intense', 'Co-op', 'Story-rich', 'Quick session', 'Open world']

export default function ChatPage() {
	const [message, setMessage] = useState('')

	function handlePromptSelect(prompt: string) {
		setMessage(`${prompt.toLowerCase()} games `)
	}

	function handleShortcutSelect(prompt: string) {
		setMessage(prompt)
	}

	return (
		<div className="min-h-screen bg-[#fbf6f0] text-[#6f5547] transition-colors duration-300 dark:bg-[#241d20] dark:text-[#eadbd2]">
			<Header />
			<main className="flex flex-col items-center px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:pt-24">
				<section className="flex w-full max-w-3xl flex-col items-center text-center">
					<h2 className="max-w-3xl font-serif text-4xl leading-[1.08] tracking-tight text-[#603f2d] sm:text-5xl md:text-6xl dark:text-[#f6e9df]">
						What are you <em className="text-[#ef9ab3]">in the mood</em>
						<br className="hidden sm:block" />{' '}
						to play tonight?
					</h2>
					<p className="mt-4 max-w-xl text-base leading-relaxed text-[#a9826f] sm:mt-5 sm:text-lg dark:text-[#c9ada1]">
						Tell LudOS the vibe, the time you’ve got, or a game you can’t stop thinking about
						&mdash; it’ll do the digging.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
						{prompts.map((prompt) => (
							<PromptPill
								key={prompt}
								label={prompt}
								onClick={handlePromptSelect}
							/>
						))}
					</div>
					<div className="mt-6 w-full sm:mt-8">
						<ChatInput value={message} onChange={setMessage} />
					</div>
				</section>
				<ShortcutSection onSelectShortcut={handleShortcutSelect} />
			</main>
		</div>
	)
}
