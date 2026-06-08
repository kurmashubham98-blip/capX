export type Platform =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'grok'
  | 'deepseek'
  | 'mistral';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface FileAttachment {
  name: string;
  type: string;
  data?: string;
  url?: string;
}

export interface ImageAttachment {
  alt: string;
  src: string;
  data?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  files?: FileAttachment[];
  images?: ImageAttachment[];
}

export interface ContextCapsule {
  id: string;
  title: string;
  source: Platform;
  model: string;
  timestamp: number;
  messages: Message[];
  metadata: {
    url: string;
    files: FileAttachment[];
    images: ImageAttachment[];
    tokenCount?: number;
  };
  tags: string[];
}

export interface ContextCapsuleSummary {
  id: string;
  title: string;
  source: Platform;
  model: string;
  timestamp: number;
  messageCount: number;
  tags: string[];
}

export type LongContextStrategy = 'auto-chunk' | 'truncate-warn';

export type InjectionType = 'web-to-web' | 'web-to-cli' | 'cli-to-web';

export interface InjectionTarget {
  platform: Platform | 'opencode' | 'claude-code' | 'gemini-cli' | 'stdin';
  type: InjectionType;
}
