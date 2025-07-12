import React from 'react';
import { AIMessage } from './AIMessage';
import { UserMessage } from './UserMessage';
import { Message } from '../../types/chat';
import { AI_PERSONAS } from '../../config/constants';

interface ChatMessageProps extends Message {
  onAnimationComplete: (messageId: number) => void;
  currentPersona: keyof typeof AI_PERSONAS;
  previousMessage?: string | null;
}

export const ChatMessage = ({
  content, 
  isAI, 
  isChatMode, 
  id, 
  hasAnimated, 
  isStreaming,
  onAnimationComplete,
  currentPersona,
  previousMessage,
  imageData
}: ChatMessageProps) => {
  if (isAI) {
    return (
      <AIMessage 
        content={content}
        isChatMode={isChatMode} 
        messageId={id}
        hasAnimated={hasAnimated}
        isStreaming={isStreaming}
        onAnimationComplete={onAnimationComplete}
        previousMessage={previousMessage}
      />
    );
  }
  return (
    <UserMessage 
      content={content} 
      imageData={imageData}
    />
  );
}
