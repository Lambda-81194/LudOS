import { useRef, useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatMessage from '../components/ChatMessage'
import Header from '../components/Header'
import { PromptPill } from '../components/PromptPill'
import { ShortcutSection } from '../components/ShortcutSection'
import { getGameRecommendation, getSimilarGames, getSurpriseGame } from '../services/aiService'

const prompts = ['Chill', 'Intense', 'Co-op', 'Story-rich', 'Quick session', 'Open world']

type Message = {
	role: 'user' | 'model'
	text: string
	title?: string
}

export default function ChatPage() {
	const [message, setMessage] = useState('')
	const [messages, setMessages] = useState<Message[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [isChatActive, setIsChatActive] = useState(false)
	const [shownSurpriseTitles, setShownSurpriseTitles] = useState<string[]>([])
	const [isSimilarMode, setIsSimilarMode] = useState(false)
	const sessionRef = useRef(0)

	function startNewSession(draft = '') {
		sessionRef.current += 1
		setMessages([])
		setMessage(draft)
		setError('')
		setIsChatActive(true)
	}

	function handlePromptSelect(prompt: string) {

		startNewSession(`${prompt.toLowerCase()} games `)
	}

	async function handleSurprise() {
		if (isLoading) return
		const activeSession = sessionRef.current + 1
		sessionRef.current = activeSession
		setIsChatActive(true)
		setMessages([{ role: 'user', text: 'Surprise me with a great game' }])
		setMessage('')
		setError('')
		setIsLoading(true)

		try {
			const result = await getSurpriseGame(shownSurpriseTitles)
			if (activeSession !== sessionRef.current) return

			if (!result.success) {
				setError(result.userMessage ?? 'I couldn’t find a surprise game right now. Please try again.')
				return
			}

			if (!result.data?.replyMessage || !result.data.title) {
				throw new Error('No surprise game was returned.')
			}

			const replyMessage = result.data.replyMessage
			const title = result.data.title
			setShownSurpriseTitles((titles) => [...titles, title])
			setMessages([
				{ role: 'user', text: 'Surprise me with a great game' },
				{ role: 'model', text: replyMessage, title },
			])
		} catch (requestError) {
			if (activeSession !== sessionRef.current) return
			console.error(requestError)
			setError(requestError instanceof Error ? requestError.message : 'I couldn’t reach the recommendation service. Please try again.')
		} finally {
			if (activeSession === sessionRef.current) setIsLoading(false)
		}
	}

	function handleShortcutSelect(prompt: string) {
		if (prompt === 'Surprise me with a great game') {
			void handleSurprise()
			return
		}
		if (prompt === 'Find games similar to a favorite') {
			sessionRef.current += 1
			setMessages([{ role: 'model', text: "What's your favorite game?" }])
			setMessage('')
			setError('')
			setIsChatActive(true)
			setIsSimilarMode(true)
			return
		}
		startNewSession(prompt)
	}

	function handleNewChat() {
		if (isLoading) return
		sessionRef.current += 1
		setMessages([])
		setMessage('')
		setError('')
		setIsChatActive(false)
		setIsSimilarMode(false)
	}

	async function handleSimilarSend(userMessage: string) {
		const activeSession = sessionRef.current
		const nextMessages = [...messages, { role: 'user' as const, text: userMessage }]
		setMessages(nextMessages)
		setError('')
		setIsLoading(true)

		try {
			const result = await getSimilarGames(userMessage)
			if (activeSession !== sessionRef.current) return

			if (!result.success) {
				setError(result.userMessage ?? 'I couldn’t find similar games right now. Please try again.')
				return
			}

			if (!result.data?.replyMessage) {
				throw new Error('No similar games response was returned.')
			}

			setMessages([...nextMessages, { role: 'model', text: result.data.replyMessage }])
			setIsSimilarMode(false)
		} catch (requestError) {
			if (activeSession !== sessionRef.current) return
			console.error(requestError)
			setError(requestError instanceof Error ? requestError.message : 'I couldn’t reach the recommendation service. Please try again.')
		} finally {
			if (activeSession === sessionRef.current) setIsLoading(false)
		}
	}

	async function handleSend(userMessage: string) {
		if (isSimilarMode) {
			await handleSimilarSend(userMessage)
			return
		}

		setIsChatActive(true)
		const activeSession = sessionRef.current
		const userEntry: Message = { role: 'user', text: userMessage }
		const history = [...messages]
		const nextMessages = [...history, userEntry]

		setMessages(nextMessages)
		setError('')
		setIsLoading(true)

		try {
			const result = await getGameRecommendation(userMessage, history)
			if (activeSession !== sessionRef.current) return

			if (!result.success) {
				setError(result.userMessage ?? 'I couldn’t get a recommendation right now. Please try again.')
				return
			}

			if (!result.data?.replyMessage) {
				throw new Error('No recommendation was returned.')
			}

			const searchSummary = result.data.searchQueries?.length
				? `\n\nI’ll look into: ${result.data.searchQueries.join(', ')}`
				: ''
			setMessages([...nextMessages, { role: 'model', text: `${result.data.replyMessage}${searchSummary}` }])
		} catch (requestError) {
			if (activeSession !== sessionRef.current) return
			console.error(requestError)
			setError(requestError instanceof Error ? requestError.message : 'I couldn’t reach the recommendation service. Please try again.')
		} finally {
			if (activeSession === sessionRef.current) setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-[#fbf6f0] text-[#6f5547] transition-colors duration-300 dark:bg-[#241d20] dark:text-[#eadbd2]">
			<Header onNewChat={handleNewChat} disabled={isLoading} />
			<main className="flex flex-col items-center px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:pt-24">
				<section className="flex w-full max-w-3xl flex-col items-center text-center">
					{!isChatActive && (
						<>
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
									<PromptPill key={prompt} label={prompt} onClick={handlePromptSelect} />
								))}
							</div>
						</>
					)}
					<div className="mt-6 w-full sm:mt-8">
						{messages.length > 0 && (
							<div className="mb-5 flex flex-col gap-3" aria-live="polite">
								{messages.map((entry, index) => (
									<ChatMessage key={`${entry.role}-${index}`} {...entry} />
								))}
								{isLoading && <p className="text-left text-sm text-[#a9826f] dark:text-[#c9ada1]">LudOS is thinking...</p>}
							</div>
						)}
						<ChatInput
							value={message}
							onChange={setMessage}
							onSend={handleSend}
							disabled={isLoading}
						/>
						{error && <p className="mt-3 text-sm text-[#b45309] dark:text-[#fbbf24]">{error}</p>}
					</div>
				</section>
				{!isChatActive && <ShortcutSection onSelectShortcut={handleShortcutSelect} />}
			</main>
		</div>
	)
}
