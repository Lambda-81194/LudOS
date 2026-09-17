import { useState } from 'react'
import ChatInput from '../components/ChatInput'
import Header from '../components/Header'
import { PromptPill } from '../components/PromptPill'

const prompts = ['Chill', 'Intense', 'Co-op', 'Story-rich', 'Quick session', 'Open world']

export default function ChatPage() {
	const [selectedPrompt, setSelectedPrompt] = useState('Chill')
	const [message, setMessage] = useState('')

	function handlePromptSelect(prompt: string) {
		setSelectedPrompt(prompt)
		setMessage(`${prompt.toLowerCase()} games `)
	}

	return (
		<div className="min-h-screen bg-[#fbf1e9] text-[#6f5547] transition-colors duration-300 dark:bg-[#181416] dark:text-[#eadbd2]">
			<Header />
			<main className="flex flex-col items-center px-6 pb-16 pt-24">
				<section className="flex w-full max-w-3xl flex-col items-center text-center">
					<h2 className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-[#603f2d] dark:text-[#f6e9df] md:text-6xl">
						What are you <em className="text-[#ef9ab3]">in the mood</em>
						<br />
						to play tonight?
					</h2>
					<p className="mt-5 max-w-xl text-lg leading-relaxed text-[#a9826f] dark:text-[#c9ada1]">
						Tell Loadout the vibe, the time you’ve got, or a game you can’t stop thinking about
						&mdash; it’ll do the digging.
					</p>
					<div className="mt-10 flex flex-wrap justify-center gap-3">
						{prompts.map((prompt) => (
							<PromptPill
								key={prompt}
								label={prompt}
								isSelected={selectedPrompt === prompt}
								onClick={handlePromptSelect}
							/>
						))}
					</div>
					<div className="mt-8 w-full">
						<ChatInput value={message} onChange={setMessage} />
					</div>
				</section>
			</main>
		</div>
	)
}
