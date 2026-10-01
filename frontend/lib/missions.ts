import { recordActivity } from './activity';
export async function missionRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  try {
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
  const result = response.status === 204 ? undefined : await response.json();
  const simulation = path.includes('/simulations') || path.startsWith('/simulations/');
  const message = simulation ? method === 'POST' ? 'Power simulation completed' : 'Saved simulation data loaded' :
    method === 'DELETE' ? 'Scenario or asset deleted' : method === 'PATCH' ? 'Scenario saved' :
    method === 'POST' ? 'Scenario or asset created' : path === '/scenarios' ? 'Scenario list loaded' : 'Scenario opened';
  recordActivity(simulation ? 'SIM' : 'MISSION', message, `${method} ${path}; id=${result?.id ?? 'none'}; revision=${result?.revision ?? 'n/a'}`);
  return result as T;
  } catch (error) { recordActivity('WARN', 'Mission request failed', `${method} ${path}; ${error instanceof Error ? error.message : 'Request failed'}`); throw error; }
}
