import { useParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { PRDetailContent } from './components/PRDetailContent/PRDetailContent';
import { ChatPanel } from './components/ChatPanel';
import { ChatPanelProvider, useChatPanel } from './contexts';

const PRDetailPageContent = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();

  const { state, closePanel } = useChatPanel();

  return (
    <div className="flex min-h-screen">
      <div
        className={`flex-1 transition-all duration-300 ${state.isOpen ? 'mr-[480px]' : ''}`}
      >
        <div className="mx-auto max-w-6xl p-8">
          <AsyncBoundary>
            <PRDetailContent projectId={projectId!} prNumber={prNumber!} />
          </AsyncBoundary>
        </div>
      </div>
      <ChatPanel
        isOpen={state.isOpen}
        onClose={closePanel}
        messages={state.messages}
        status={state.status}
        title={state.title}
      />
    </div>
  );
};

export const PRDetailPage = () => {
  return (
    <ChatPanelProvider>
      <PRDetailPageContent />
    </ChatPanelProvider>
  );
};
