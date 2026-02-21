import { useParams } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { projectsQuery, prsQuery } from '@/shared/apis';
import { parseGitHubUrl, linkifyIssueReferences } from '@/shared/utils';
import { PRHeader } from './components/PRHeader/PRHeader';
import { PRDescription } from './components/PRDescription/PRDescription';
import { ReviewList } from './components/ReviewList/ReviewList';
import { CommentList } from './components/CommentList/CommentList';
import { CommitList } from './components/CommitList/CommitList';

export const PRDetailPage = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();

  const { data: project } = useSuspenseQuery(projectsQuery.detail(projectId!));
  const { data: pr } = useSuspenseQuery(
    prsQuery.detail(projectId!, Number(prNumber))
  );

  const githubBaseUrl = parseGitHubUrl(project.gitInfo.remoteUrl);
  const linkedBody = pr.body
    ? linkifyIssueReferences(pr.body, githubBaseUrl)
    : '';

  return (
    <div className="mx-auto max-w-6xl p-8">
      <PRHeader
        projectId={projectId!}
        projectName={project.name}
        prNumber={prNumber!}
        pr={pr}
      />

      {linkedBody && <PRDescription body={linkedBody} />}

      <ReviewList reviews={pr.reviews} />
      <CommentList comments={pr.comments} />
      <CommitList commits={pr.commits} />
    </div>
  );
};
