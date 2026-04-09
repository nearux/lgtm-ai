export const projectsQueryKey = {
  all: ['projects'] as const,
  lists: () => [...projectsQueryKey.all, 'list'] as const,
  list: () => [...projectsQueryKey.lists()] as const,
  details: () => [...projectsQueryKey.all, 'detail'] as const,
  detail: (id: string) => [...projectsQueryKey.details(), id] as const,
};
