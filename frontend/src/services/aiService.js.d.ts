export type ChatHistoryEntry = {
	role: 'user' | 'model'
	text: string
}

export type RecommendationResult = {
	success: boolean
	data?: {
		replyMessage?: string
		searchQueries?: string[]
	}
	error?: string
	userMessage?: string
}

export function getGameRecommendation(
	userMessage: string,
	history?: ChatHistoryEntry[],
): Promise<RecommendationResult>
