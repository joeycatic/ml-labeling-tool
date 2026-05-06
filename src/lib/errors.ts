export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(message, 400, details);
}

export function notFound(message: string, details?: unknown) {
  return new AppError(message, 404, details);
}

export function conflict(message: string, details?: unknown) {
  return new AppError(message, 409, details);
}
