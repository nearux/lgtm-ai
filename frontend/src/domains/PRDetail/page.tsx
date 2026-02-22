import { useParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { PRDetailContent } from './components/PRDetailContent/PRDetailContent';

export const PRDetailPage = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();

  return (
    <div className="mx-auto max-w-6xl p-8">
      <AsyncBoundary>
        <PRDetailContent projectId={projectId!} prNumber={prNumber!} />
      </AsyncBoundary>
    </div>
  );
};
