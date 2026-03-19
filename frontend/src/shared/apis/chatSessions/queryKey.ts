export const chatSessionsQueryKey = {
  all: ['chatSessions'] as const,
  list: (projectId: string, prNumber: number) =>
    [...chatSessionsQueryKey.all, 'list', projectId, prNumber] as const,
  history: (projectId: string, prNumber: number, sessionId: string) =>
    [
      ...chatSessionsQueryKey.all,
      'history',
      projectId,
      prNumber,
      sessionId,
    ] as const,
};
