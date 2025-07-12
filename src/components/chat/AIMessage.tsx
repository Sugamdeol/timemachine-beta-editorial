import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MessageProps } from '../../types/chat';
import { AI_PERSONAS } from '../../config/constants';
import { useTheme } from '../../context/ThemeContext';
import { GeneratedImage } from './GeneratedImage';
import { AnimatedShinyText } from '../ui/AnimatedShinyText';
import { TypingDots } from './TypingDots';

interface AIMessageProps extends MessageProps {
  isChatMode: boolean;
  messageId: number;
  onAnimationComplete: (messageId: number) => void;
  currentPersona?: keyof typeof AI_PERSONAS;
  previousMessage?: string | null;
}

const getPersonaColor = (persona: keyof typeof AI_PERSONAS = 'default') => {
  switch (persona) {
    case 'girlie':
      return 'text-pink-400';
    case 'pro':
      return 'text-cyan-400';
    default:
      return 'text-purple-400';
  }
};

const getPersonaShimmerColors = (persona: keyof typeof AI_PERSONAS = 'default') => {
  switch (persona) {
    case 'girlie':
      return { baseColor: '#ec4899', shimmerColor: '#ffffff' }; // Pink base with white shimmer
    case 'pro':
      return { baseColor: '#06b6d4', shimmerColor: '#ffffff' }; // Cyan base with white shimmer
    default:
      return { baseColor: '#a855f7', shimmerColor: '#ffffff' }; // Purple base with white shimmer
  }
};

const extractMentionedPersona = (message: string | null): keyof typeof AI_PERSONAS | null => {
  if (!message) return null;
  const match = message.match(/^@(girlie|pro)\s/);
  return match ? match[1] as keyof typeof AI_PERSONAS : null;
};

export function AIMessage({ 
  content, 
  isChatMode, 
  messageId, 
  hasAnimated, 
  isStreaming,
  onAnimationComplete, 
  currentPersona = 'default',
  previousMessage = null
}: AIMessageProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const mentionedPersona = extractMentionedPersona(previousMessage);
  const displayPersona = mentionedPersona || currentPersona;
  const personaColor = getPersonaColor(displayPersona);
  const shimmerColors = getPersonaShimmerColors(displayPersona);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Handle image generation detection
  useEffect(() => {
    // Check if we have a complete image link
    if (content.includes('![Image](https://image.pollinations.ai/')) {
      const imageRegex = /!\[Image\]\(https:\/\/image\.pollinations\.ai\/prompt\/[^)]+\)/g;
      const matches = content.match(imageRegex);
      
      if (matches) {
        // Complete image markdown found, show generating state briefly
        setIsGeneratingImage(true);
        setTimeout(() => {
          setIsGeneratingImage(false);
        }, 1500);
      }
    }
  }, [content]);

  const MarkdownComponents = {
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className={`text-2xl font-bold mt-6 mb-4 ${theme.text}`}>{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className={`text-xl font-bold mt-5 mb-3 ${theme.text}`}>{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className={`text-lg font-bold mt-4 mb-2 ${theme.text}`}>{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p className={`mb-4 leading-relaxed ${theme.text}`}>{children}</p>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className={`font-bold ${personaColor}`}>{children}</strong>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <em className={`italic opacity-80 ${theme.text}`}>{children}</em>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc ml-4 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal ml-4 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className={`leading-relaxed ${theme.text}`}>{children}</li>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className={`border-l-4 border-purple-500/50 pl-4 my-4 italic opacity-70 ${theme.text}`}>
        {children}
      </blockquote>
    ),
    code: ({ children }: { children: React.ReactNode }) => (
      <code className={`bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono ${theme.text}`}>
        {children}
      </code>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className={`bg-white/10 rounded-lg p-4 mb-4 overflow-x-auto font-mono text-sm ${theme.text}`}>
        {children}
      </pre>
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      // Check if this is a Pollinations.ai generated image
      if (src && src.includes('image.pollinations.ai')) {
        return <GeneratedImage src={src} alt={alt || 'Generated image'} />;
      }
      
      // Fallback to regular image for other sources
      return (
        <img 
          src={src} 
          alt={alt} 
          className="max-w-full h-auto rounded-xl my-4"
          loading="lazy"
        />
      );
    }
  };

  const MessageContent = () => (
    <>
      {/* Generating image state */}
      {isGeneratingImage && (
        <div className="w-full max-w-2xl mx-auto my-4">
          <div className="flex items-center justify-center py-4 px-4 rounded-2xl bg-black/5 backdrop-blur-sm">
            <AnimatedShinyText
              text="Generating Image"
              useShimmer={true}
              baseColor={shimmerColors.baseColor}
              shimmerColor={shimmerColors.shimmerColor}
              gradientAnimationDuration={2}
              textClassName="text-base"
              className="py-1"
              style={{ 
                fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '16px'
              }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      {content && (
        <>
          {isChatMode ? (
            <div className="flex flex-col gap-1">
              <div className={`text-xs font-medium ${personaColor} opacity-60`}>
                {AI_PERSONAS[displayPersona].name}
              </div>
              <div className={`${theme.text} text-base leading-relaxed max-w-[85%]`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={MarkdownComponents}
                  className="prose prose-invert prose-sm max-w-none"
                >
                  {content}
                </ReactMarkdown>
                
                {/* Show typing indicator when streaming */}
                {isStreaming && (
                  <div className="flex items-center gap-2 mt-2">
                    <TypingDots className="opacity-60" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`${theme.text} ${
              isChatMode 
                ? 'text-base sm:text-lg' 
                : 'text-xl sm:text-2xl md:text-3xl'
            } w-full max-w-4xl mx-auto text-center`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={MarkdownComponents}
                className="prose prose-invert max-w-none"
              >
                {content}
              </ReactMarkdown>
              
              {/* Show typing indicator when streaming */}
              {isStreaming && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <TypingDots className="opacity-60" />
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div ref={contentEndRef} />
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onAnimationComplete={() => !hasAnimated && onAnimationComplete(messageId)}
      className={`w-full`}
    >
      <MessageContent />
    </motion.div>
  );
}
