export type ChatHistoryEntry = {
	role: 'user' | 'model'
	text: string
}

export type RecommendationResult = {
	success: boolean
	data?: {
		replyMessage?: string
		searchQueries?: string[]
		title?: string
		matchedTitle?: string | null
		found?: boolean
	}
	error?: string
	userMessage?: string
}

export function getGameRecommendation(
	userMessage: string,
	history?: ChatHistoryEntry[],
): Promise<RecommendationResult>

export function getSurpriseGame(
	excludeTitles?: string[],
): Promise<RecommendationResult>

export function getSimilarGames(
	favoriteGame: string,
): Promise<RecommendationResult>
