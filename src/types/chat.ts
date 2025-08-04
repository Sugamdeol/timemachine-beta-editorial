export interface Message {
  id: number;
  content: string;
  isAI: boolean;
  hasAnimated?: boolean;
  isStreaming?: boolean;
  imageData?: string | string[]; // Add imageData field
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isChatMode: boolean;
}

export interface ChatActions {
  handleSendMessage: (message: string, imageData?: string | string[], originalFiles?: File[]) => Promise<void>;
  setChatMode: (isChatMode: boolean) => void;
}

export interface ChatInputProps {
  onSendMessage: (message: string, imageData?: string | string[], originalFiles?: File[]) => Promise<void>;
  isLoading?: boolean;
}

export interface ShowHistoryProps {
  isChatMode: boolean;
  onToggle: () => void;
}

export interface MessageProps {
  content: string;
  isLoading?: boolean;
  hasAnimated?: boolean;
  onAnimationComplete?: () => void;
  imageData?: string | string[];
  isStreaming?: boolean;
}
