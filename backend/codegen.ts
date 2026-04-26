import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './graphql/schema/github.graphql',
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
