import { useSuspenseQueries } from '@tanstack/react-query';
import { projectsQuery, prsQuery } from '@/shared/apis';
import { parseGitHubUrl, linkifyGitHubReferences } from '@/shared/utils';
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

      {linkedBody && <PRDescription body={linkedBody} />}

      <ActivityTimeline
        reviews={pr.reviews}
        comments={pr.comments}
        workingDir={project.working_dir}
        projectId={projectId}
        prNumber={pr.number}
      />
      <CommitList commits={pr.commits} githubBaseUrl={githubBaseUrl} />
    </>
  );
};
