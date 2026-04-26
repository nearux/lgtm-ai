import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
  },
  plugins: [
    {
      name: 'gql-loader',
      transform(code, id) {
        if (id.endsWith('.gql')) {
          return { code: `export default ${JSON.stringify(code)};` };
        }
      },
    },
  ],
});
