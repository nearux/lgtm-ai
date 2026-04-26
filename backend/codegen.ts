import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './graphql/schema/github.graphql',
  documents: './graphql/queries/**/*.gql',
  generates: {
    './graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        avoidOptionals: false,
        strictScalars: true,
        scalars: {
          Base64String: 'string',
          BigInt: 'number',
          CustomPropertyValue: 'string',
          Date: 'string',
          DateTime: 'string',
          GitObjectID: 'string',
          GitRefname: 'string',
          GitSSHRemote: 'string',
          GitTimestamp: 'string',
          HTML: 'string',
          PreciseDateTime: 'string',
          URI: 'string',
          X509Certificate: 'string',
          _Any: 'unknown',
        },
      },
    },
    './graphql/schema/github.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
