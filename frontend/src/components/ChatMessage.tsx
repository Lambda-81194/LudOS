type ChatMessageProps = {
	role: 'user' | 'model'
	text: string
	title?: string
}

type RecommendationBlock = {
	title: string
	price: string
	review: string
	reason: string
}

type SimilarBlock = RecommendationBlock & {
	intro?: string
}

function parseRecommendationBlock(text: string): RecommendationBlock | null {
	const normalized = text.replace(/\s+/g, ' ').trim()
	const titleMatch = normalized.match(/^(?:\d+\.\s*)?(.+?)\s+—\s+(.+?)\s+\|\s+(.+?)(?=\s+Why:|$)/i)
	const reasonMatch = normalized.match(/\bWhy:\s*(.+)$/i)

	if (!titleMatch || !reasonMatch) return null

	return {
		title: titleMatch[1].replace(/^\*+|\*+$/g, '').trim(),
		price: titleMatch[2].trim(),
		review: titleMatch[3].trim(),
		reason: reasonMatch[1].trim(),
	}
}

function parseRecommendations(text: string): RecommendationBlock[] | null {
	const entries = text
		.replace(/\n+/g, ' ')
		.split(/(?=\d+\.\s+)/)
		.map((entry) => entry.trim())
		.filter(Boolean)
	const blocks = entries.map(parseRecommendationBlock).filter(
		(block): block is RecommendationBlock => block !== null,
	)

	return blocks.length ? blocks : null
}

function parseSurprise(text: string, title: string): RecommendationBlock {
	const priceMatch = text.match(/\b(?:Free|\$\d+(?:\.\d{1,2})?)\b/i)
	const ratingMatch = text.match(/\b(Very Positive|Mostly Positive|Positive|Mixed|Negative|Very Negative)\b/i)
	const firstSentenceEnd = text.search(/[.!?](?:\s|$)/)
	const reason = firstSentenceEnd >= 0 ? text.slice(firstSentenceEnd + 1).trim() : text

	return {
		title,
		price: priceMatch?.[0] ?? 'Price unavailable',
		review: ratingMatch?.[1] ?? 'Rating unavailable',
		reason,
	}
}

function parseSimilar(text: string): SimilarBlock[] | null {
	const paragraphs = text
		.replace(/\n+/g, ' ')
		.split(/(?=\d+\.\s+)/)
		.map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
	const blocks: SimilarBlock[] = []

	for (const paragraph of paragraphs) {
		const structuredMatch = paragraph.match(
			/^(?:\d+\.\s*)?(.+?)\s+[—–-]\s+(Free|\$\d+(?:\.\d{1,2})?)\s*,\s*(Very Positive|Mostly Positive|Positive|Mixed|Negative|Very Negative)(?:\s*\(\d+%\s*positive\))?\s+[—–-]\s+(.+)$/i,
		)
		const boldMatches = [...paragraph.matchAll(/\*\*(.+?)\*\*/g)]
		const titleMatch = paragraph.match(/(?:enjoy|recommend|try|consider)\s+\*\*(.+?)\*\*/i) ?? boldMatches[0]
		const priceMatch = paragraph.match(/\b(?:Free|\$\d+(?:\.\d{1,2})?)\b/i)
		const ratingMatch = paragraph.match(/\b(Very Positive|Mostly Positive|Positive|Mixed|Negative|Very Negative)(?:\s*\(\d+%\))?/i)

		if (structuredMatch) {
			blocks.push({
				title: structuredMatch[1].replace(/^\*+|\*+$/g, '').trim(),
				price: structuredMatch[2],
				review: structuredMatch[3],
				reason: structuredMatch[4].replace(/\*+/g, '').trim(),
			})
			continue
		}

		if (!titleMatch || !priceMatch || !ratingMatch) continue

		const reason = paragraph
			.replace(/\*\*(.+?)\*\*/g, '$1')
			.replace(/\s+/g, ' ')
			.trim()

		blocks.push({
			title: titleMatch[1].trim(),
			price: priceMatch[0],
			review: ratingMatch[0],
			reason,
		})
	}

	return blocks.length ? blocks : null
}

function RecommendationCard({ block }: { block: RecommendationBlock }) {
	return (
		<div className="border-b border-[#ead8c9] pb-3 last:border-b-0 last:pb-0 dark:border-[#665365]">
			<p className="font-semibold text-[#603f2d] dark:text-[#f6e9df]">{block.title}</p>
			<div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wide">
				<span className="font-bold text-[#d39a22] dark:text-[#f4d58a]">Price</span>
				<span className="font-medium text-[#6f5547] dark:text-[#eadbd2]">{block.price}</span>
				<span className="font-bold text-[#4f9aa2] dark:text-[#72d1d0]">Review</span>
				<span className="font-medium text-[#6f5547] dark:text-[#eadbd2]">{block.review}</span>
			</div>
			<p className="mt-2 text-sm leading-relaxed">{block.reason}</p>
		</div>
	)
}

export default function ChatMessage({ role, text, title }: ChatMessageProps) {
	const isUser = role === 'user'
	const recommendation = !isUser && title ? parseSurprise(text, title) : null
	const recommendations = !isUser && !title ? parseRecommendations(text) : null
	const similarRecommendations = !isUser && !title && !recommendations ? parseSimilar(text) : null

	return (
		<div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 text-left text-sm leading-relaxed sm:max-w-[75%] sm:text-base ${
					isUser
						? 'rounded-br-md bg-[#f19ab4] text-[#603447]'
						: 'rounded-bl-md border border-[#ead8c9] bg-[#f5e9df] text-[#6f5547] dark:border-[#665365] dark:bg-[#4c3d4e] dark:text-[#eadbd2]'
				}`}
			>
				{recommendation ? (
					<div className="space-y-2">
						<RecommendationCard block={recommendation} />
					</div>
				) : recommendations ? (
					<div className="space-y-3">
						{recommendations.map((recommendationBlock) => (
							<RecommendationCard key={recommendationBlock.title} block={recommendationBlock} />
						))}
					</div>
				) : similarRecommendations ? (
					<div className="space-y-3">
						{similarRecommendations.map((similarGame) => (
							<RecommendationCard key={similarGame.title} block={similarGame} />
						))}
					</div>
				) : (
					text.split('\n\n').map((paragraph, index) => (
						<p key={`${paragraph}-${index}`} className={index > 0 ? 'mt-3' : undefined}>
							{paragraph}
						</p>
					))
				)}
			</div>
		</div>
	)
}