/**
 * Reads a response that is *supposed* to be JSON. Platform-level failures
 * (request too large, gateway timeouts) come back empty or as HTML, and calling
 * response.json() on those throws a parse error that hides the real status.
 */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(
      response.status === 413
        ? "That photo was too large to upload."
        : `The server returned an empty ${response.status} response.`,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Unexpected ${response.status} response from the server.`);
  }

  if (!response.ok) {
    const message = (data as { error?: string })?.error;
    throw new Error(message || `Request failed (${response.status}).`);
  }

  return data as T;
}
