import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  if (err instanceof ValidateError) {
    res.status(400).json({ message: 'Validation failed', fields: err.fields });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
  });
}
