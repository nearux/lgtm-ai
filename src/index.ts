#!/usr/bin/env node

const VERSION = "0.0.1";

export function main(): void {
  console.log(`
  _     ____ _____ __  __      _    ___
 | |   / ___|_   _|  \\/  |    / \\  |_ _|
 | |  | |  _  | | | |\\/| |   / _ \\  | |
 | |__| |_| | | | | |  | |  / ___ \\ | |
 |_____\\____| |_| |_|  |_| /_/   \\_\\___|

  Auto-apply PR reviews with Claude Code

  Version: ${VERSION}

  Coming soon...
  `);
}

if (require.main === module) {
  main();
}
