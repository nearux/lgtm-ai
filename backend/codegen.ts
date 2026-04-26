import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: {
    'https://api.github.com/graphql': {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN ?? ''}`,
      },
    },
  },
  documents: './graphql/queries/**/*.gql',
  generates: {
    './graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        avoidOptionals: false,
        strictScalars: false,
      },
    },
    './graphql/schema/github.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
