import { useParams } from 'react-router-dom';
import { useAsync } from '@/shared/hooks';
import { getPRDetail, getProject } from '@/shared/api';
import { FullPageLoading, FullPageError } from '@/shared/components';
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

  const { data: project } = useAsync(() => getProject(projectId!), [projectId]);

  const {
    data: pr,
    isLoading,
    error,
    refetch,
  } = useAsync(
    () => getPRDetail(projectId!, Number(prNumber)),
    [projectId, prNumber]
  );

  const githubBaseUrl = parseGitHubUrl(project?.gitInfo.remoteUrl ?? null);
  const linkedBody = pr?.body
    ? linkifyIssueReferences(pr.body, githubBaseUrl)
    : '';

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (error) {
    return <FullPageError message={error} onRetry={refetch} />;
  }

  if (!pr) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <PRHeader
        projectId={projectId!}
        projectName={project?.name}
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
