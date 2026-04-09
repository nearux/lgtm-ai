export const chatSessionsQueryKey = {
  all: ['chatSessions'] as const,
  lists: () => [...chatSessionsQueryKey.all, 'list'] as const,
  list: (projectId: string, prNumber: number) =>
    [...chatSessionsQueryKey.lists(), projectId, prNumber] as const,
  histories: () => [...chatSessionsQueryKey.all, 'history'] as const,
  history: (projectId: string, prNumber: number, sessionId: string) =>
    [
      ...chatSessionsQueryKey.histories(),
      projectId,
      prNumber,
      sessionId,
    ] as const,
};
