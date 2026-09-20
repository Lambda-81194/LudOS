// Uses VITE_BACKEND_URL set in environment variables, falling back to local port 8000
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Parses HTTP error codes and returns structured error details.
 */
function getErrorDetails(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (/\b50[234]\b/.test(message)) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      userMessage: 'The recommendation backend is warming up or busy. Please try again in a moment.'
    };
  }

  if (/\b429\b/.test(message)) {
    return {
      code: 'RATE_LIMITED',
      userMessage: 'Too many requests right now. Please wait a bit before trying again.'
    };
  }

  return {
    code: 'REQUEST_FAILED',
    userMessage: 'I couldn’t get a recommendation right now. Please try again.'
  };
}

/**
 * Sends the user prompt to the self-hosted RAG FastAPI backend on Render.
 * @param {string} userMessage - The latest query typed by the user.
 * @returns {Promise<{success: boolean, data?: object, error?: string, userMessage?: string}>}
 */
export async function getGameRecommendation(userMessage) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rag-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: userMessage }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = typeof body.detail === "string" ? body.detail : "";
      throw new Error(
        `Backend response failed with status ${response.status}: ${detail}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        replyMessage: data.answer
      }
    };

  } catch (error) {
    console.error("Backend RAG Error:", error);
    const details = getErrorDetails(error);

    return {
      success: false,
      error: details.code,
      userMessage: details.userMessage
    };
  }
}