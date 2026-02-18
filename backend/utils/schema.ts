import HttpStatus from 'http-status';
import { z, ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function parseSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError(err.issues[0].message, HttpStatus.BAD_REQUEST);
    }
    throw err;
  }
}
