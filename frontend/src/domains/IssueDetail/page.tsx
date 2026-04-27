import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { IssueDetailContent } from './components/IssueDetailContent/IssueDetailContent';

export const IssueDetailPage = () => {
  const { projectId, issueNumber } = useParams<{
    projectId: string;
    issueNumber: string;
  }>();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') ?? undefined;

  if (!projectId || !issueNumber) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <AsyncBoundary>
        <IssueDetailContent
          projectId={projectId}
          issueNumber={issueNumber}
          origin={origin}
        />
      </AsyncBoundary>
    </div>
  );
};
