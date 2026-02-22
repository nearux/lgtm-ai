import { useSuspenseQueries } from '@tanstack/react-query';
import { projectsQuery, prsQuery } from '@/shared/apis';
import { parseGitHubUrl, linkifyIssueReferences } from '@/shared/utils';
import { PRHeader } from '../PRHeader/PRHeader';
import { PRDescription } from '../PRDescription/PRDescription';
import { ReviewList } from '../ReviewList/ReviewList';
import { CommentList } from '../CommentList/CommentList';
import { CommitList } from '../CommitList/CommitList';

interface Props {
  projectId: string;
  prNumber: string;
}

export const PRDetailContent = ({ projectId, prNumber }: Props) => {
  const [{ data: project }, { data: pr }] = useSuspenseQueries({
    queries: [
      projectsQuery.detail(projectId),
      prsQuery.detail(projectId, Number(prNumber)),
    ],
  });

  const githubBaseUrl = parseGitHubUrl(project.gitInfo.remoteUrl);
  const linkedBody = pr.body
    ? linkifyIssueReferences(pr.body, githubBaseUrl)
    : '';

  return (
    <>
      <PRHeader
        projectId={projectId}
        projectName={project.name}
        prNumber={prNumber}
        pr={pr}
      />

      {linkedBody && <PRDescription body={linkedBody} />}

      <ReviewList reviews={pr.reviews} />
      <CommentList comments={pr.comments} />
      <CommitList commits={pr.commits} />
    </>
  );
};
