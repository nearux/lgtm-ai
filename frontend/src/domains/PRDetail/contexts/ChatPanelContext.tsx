import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ClaudeMessage, ConnectionStatus } from '../hooks';

interface ChatPanelState {
  isOpen: boolean;
  title: string;
  messages: ClaudeMessage[];
  status: ConnectionStatus;
}

interface ChatPanelContextValue {
  state: ChatPanelState;
  openPanel: (title: string) => void;
  closePanel: () => void;
  setMessages: (messages: ClaudeMessage[]) => void;
  setStatus: (status: ConnectionStatus) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ChatPanelState>({
    isOpen: false,
    title: 'Claude',
    messages: [],
    status: 'disconnected',
  });

  const openPanel = (title: string) => {
    setState((prev) => ({ ...prev, isOpen: true, title }));
  };

  const closePanel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const setMessages = (messages: ClaudeMessage[]) => {
    setState((prev) => ({ ...prev, messages }));
  };

  const setStatus = (status: ConnectionStatus) => {
    setState((prev) => ({ ...prev, status }));
  };

  return (
    <ChatPanelContext.Provider
      value={{ state, openPanel, closePanel, setMessages, setStatus }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
};

export const useChatPanel = () => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return context;
};
