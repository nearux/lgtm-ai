import { useSuspenseQueries } from '@tanstack/react-query';
import { projectsQuery, prsQuery } from '@/shared/apis';
import { parseGitHubUrl, linkifyGitHubReferences } from '@/shared/utils';
import type { PRMeta } from '@lgtmai/backend/types';
import { usePRChat } from '../../hooks/usePRChat';
import { PRHeader } from '../PRHeader/PRHeader';
import { PRDescription } from '../PRDescription/PRDescription';
import { ActivityTimeline } from '../ActivityTimeline/ActivityTimeline';
import { CommitList } from '../CommitList/CommitList';

interface Props {
  projectId: string;
  prNumber: string;
  origin?: string;
}

export const PRDetailContent = ({ projectId, prNumber, origin }: Props) => {
  const [{ data: project }, { data: pr }] = useSuspenseQueries({
    queries: [
      projectsQuery.detail(projectId),
      prsQuery.detail(projectId, Number(prNumber), origin),
    ],
  });

  const remote = project.gitInfo.remotes.find(
    (r) => r.name === (origin ?? 'origin')
  );
  const githubBaseUrl = parseGitHubUrl(
    remote?.url ?? project.gitInfo.remoteUrl
  );
  const linkedBody = pr.body
    ? linkifyGitHubReferences(pr.body, githubBaseUrl)
    : '';

  // Extract "owner/repo" from the GitHub base URL (e.g. "https://github.com/owner/repo")
  const repoOwnerName = githubBaseUrl
    ? githubBaseUrl.replace('https://github.com/', '')
    : '';

  const prMeta: PRMeta = {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? '',
    baseBranch: pr.baseBranch,
    headBranch: pr.headBranch,
    repoOwnerName,
  };

  const { openPRChat } = usePRChat({
    projectId,
    prNumber: pr.number,
    prMeta,
    prAuthor: pr.author.login,
    prBody: pr.body ?? '',
    workingDir: project.working_dir,
  });

  return (
    <>
      <PRHeader
        projectId={projectId}
        projectName={project.name}
        prNumber={prNumber}
        pr={pr}
        origin={origin}
        githubBaseUrl={githubBaseUrl}
      />

      {linkedBody && (
        <PRDescription body={linkedBody} onAskClaude={openPRChat} />
      )}

      <ActivityTimeline
        reviews={pr.reviews}
        comments={pr.comments}
        workingDir={project.working_dir}
        projectId={projectId}
        prNumber={pr.number}
        prState={pr.state}
        currentBranch={project.gitInfo.currentBranch}
        prHeadBranch={pr.headBranch}
        origin={origin}
        prMeta={prMeta}
      />
      <CommitList commits={pr.commits} githubBaseUrl={githubBaseUrl} />
    </>
  );
};
