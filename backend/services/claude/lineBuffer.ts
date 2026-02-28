/**
 * Accumulates raw string chunks and yields complete newline-delimited lines.
 * Retains any trailing incomplete line across calls.
 */
export class LineBuffer {
  private buffer = '';

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    return lines;
  }

  flush(): string {
    const remaining = this.buffer;
    this.buffer = '';
    return remaining;
  }
}
