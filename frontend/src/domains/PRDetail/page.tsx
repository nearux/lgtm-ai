import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { PRDetailContent } from './components/PRDetailContent/PRDetailContent';
import { ChatPanel } from './components/ChatPanel';
import { ChatPanelProvider } from './contexts';
import { useChatPanelController, useChatPanelParams } from './hooks';

export const PRDetailPage = () => {
  return (
    <ChatPanelProvider>
      <PRDetailPageContent />
    </ChatPanelProvider>
  );
};

const PRDetailPageContent = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') ?? undefined;
  const initialPanelRef = useRef(searchParams.get('panel'));

  const { closePanel } = useChatPanelParams();
  const chatPanel = useChatPanelController();

  // NOTE: Clear panel params on mount (page refresh)
  useEffect(() => {
    if (initialPanelRef.current) {
      closePanel();
      initialPanelRef.current = null;
    }
  }, [closePanel]);

  return (
    <div className="flex min-h-screen">
      <div
        className={`flex-1 transition-all duration-300 ${chatPanel.isOpen ? 'mr-[480px]' : ''}`}
      >
        <div className="mx-auto max-w-6xl p-8">
          <AsyncBoundary>
            <PRDetailContent
              projectId={projectId!}
              prNumber={prNumber!}
              origin={origin}
            />
          </AsyncBoundary>
        </div>
      </div>
      <ChatPanel {...chatPanel} />
    </div>
  );
};
