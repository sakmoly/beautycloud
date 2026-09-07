import type { FrappeErrorPayload } from "./types";

export class FrappeApiError extends Error {
  readonly excType?: string;
  readonly status: number;

  constructor(message: string, options?: { excType?: string; status?: number }) {
    super(message);
    this.name = "FrappeApiError";
    this.excType = options?.excType;
    this.status = options?.status ?? 400;
  }
}

export function parseFrappeError(
  payload: FrappeErrorPayload,
  status = 400,
): FrappeApiError {
  let message = payload.message ?? payload.exception ?? "Request failed";

  if (payload._server_messages) {
    try {
      const messages = JSON.parse(payload._server_messages) as string[];
      const parsed = messages
        .map((entry) => {
          try {
            const obj = JSON.parse(entry) as { message?: string };
            return obj.message;
          } catch {
            return entry;
          }
        })
        .filter(Boolean);
      if (parsed.length) {
        message = parsed.join(" ");
      }
    } catch {
      // keep default message
    }
  }

  return new FrappeApiError(message, { excType: payload.exc_type, status });
}

export function toClientError(error: unknown) {
  if (error instanceof FrappeApiError) {
    return { error: error.message, exc_type: error.excType, status: error.status };
  }
  if (error instanceof Error) {
    return { error: error.message, status: 500 };
  }
  return { error: "Unexpected error", status: 500 };
}
