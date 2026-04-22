import type { RawData } from 'ws';

export function toUtf8(rawData: RawData): string {
  if (Array.isArray(rawData)) return Buffer.concat(rawData).toString('utf-8');
  if (Buffer.isBuffer(rawData)) return rawData.toString('utf-8');
  return Buffer.from(rawData).toString('utf-8');
}
