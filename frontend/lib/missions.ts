export async function missionRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, { method, cache: "no-store", signal: AbortSignal.timeout(30000),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = typeof error.detail?.message === "string" ? error.detail.message :
      response.status === 422 ? "Check the parameters and units. The definition was rejected." :
      response.status === 503 ? "NASA terrain is unavailable; prepare the data and restart the backend." : "The mission API could not complete this action. Retry after checking the backend.";
    throw new Error(message);
  }
  return response.status === 204 ? undefined as T : response.json();
}
