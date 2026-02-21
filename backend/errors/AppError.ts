export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'AppError';
  }
}
