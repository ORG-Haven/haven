export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Set by hvnBFF when errors with the same status need telling apart, e.g. "email_taken". */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;
