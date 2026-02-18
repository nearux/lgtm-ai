import { HttpStatus } from 'http-status';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}
