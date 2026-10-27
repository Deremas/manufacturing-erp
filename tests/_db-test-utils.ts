function normalizeDbMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "";
  }

  return `${error.name} ${error.message}`.toUpperCase();
}

export function isTransientDbError(error: unknown) {
  const message = normalizeDbMessage(error);
  return (
    message.includes("CONNECTION_CLOSED") ||
    message.includes("CONNECT_TIMEOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("57P01") ||
    message.includes("TOO MANY CLIENTS") ||
    message.includes("SERVER CLOSED THE CONNECTION") ||
    message.includes("EACCES") ||
    message.includes("P1001")
  );
}

export async function runWithTransientDbRetry<T>(
  work: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientDbError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}
