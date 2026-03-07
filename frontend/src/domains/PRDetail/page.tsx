import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { PRDetailContent } from './components/PRDetailContent/PRDetailContent';

export const PRDetailPage = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') ?? undefined;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <AsyncBoundary>
        <PRDetailContent
          projectId={projectId!}
          prNumber={prNumber!}
          origin={origin}
        />
      </AsyncBoundary>
    </div>
  );
};
