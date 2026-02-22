export const projectsQueryKey = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};
