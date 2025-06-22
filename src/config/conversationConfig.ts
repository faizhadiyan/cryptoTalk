// conversationConfig.ts
export interface ConversationConfig {
  // Timing configurations (in milliseconds)
  minResponseDelay: number;
  maxResponseDelay: number;
  cooldownPeriod: number;
  conversationTimeout: number;
  mentionResponseDelay: {
    min: number;
    max: number;
  };
  userMessageResponseDelay: {
    min: number;
    max: number;
  };
  
  // Behavior configurations
  maxConsecutiveResponses: number;
  typingSimulation: {
    enabled: boolean;
    baseDelay: number; // milliseconds per character
    maxDelay: number; // maximum typing delay
  };
  
  // Character response weights (probability of responding to user messages)
  characterWeights: {
    [characterName: string]: number;
  };
  
  // Conversation flow settings
  maxScheduledResponses: number;
  responseSpacing: {
    min: number; // minimum time between scheduled responses
    max: number; // maximum time between scheduled responses
  };
}

export const defaultConversationConfig: ConversationConfig = {
  // 2-8 minutes for regular responses
  minResponseDelay: 2 * 60 * 1000,
  maxResponseDelay: 8 * 60 * 1000,
  
  // 5 minutes cooldown after speaking
  cooldownPeriod: 5 * 60 * 1000,
  
  // 15 minutes of inactivity ends conversation
  conversationTimeout: 15 * 60 * 1000,
  
  // 30 seconds to 2 minutes for mention responses
  mentionResponseDelay: {
    min: 30 * 1000,
    max: 2 * 60 * 1000
  },
  
  // 1-3 minutes for user message responses
  userMessageResponseDelay: {
    min: 1 * 60 * 1000,
    max: 3 * 60 * 1000
  },
  
  // Maximum 2 consecutive responses before forcing a pause
  maxConsecutiveResponses: 2,
  
  // Typing simulation settings
  typingSimulation: {
    enabled: true,
    baseDelay: 50, // 50ms per character
    maxDelay: 5000 // max 5 seconds typing
  },
  
  // Character response probabilities
  characterWeights: {
    'ELON_MUSK': 0.35,      // Most active
    'DONALD_TRUMP': 0.30,   // Very active
    'JEROME_POWELL': 0.20,  // Measured
    'WARREN_BUFFETT': 0.15  // Most conservative
  },
  
  // Maximum 3 responses scheduled at once
  maxScheduledResponses: 3,
  
  // 30 seconds to 2 minutes between scheduled responses
  responseSpacing: {
    min: 30 * 1000,
    max: 2 * 60 * 1000
  }
};

// Development config for faster testing
export const devConversationConfig: ConversationConfig = {
  ...defaultConversationConfig,
  minResponseDelay: 10 * 1000,      // 10 seconds
  maxResponseDelay: 30 * 1000,      // 30 seconds
  cooldownPeriod: 30 * 1000,        // 30 seconds
  conversationTimeout: 5 * 60 * 1000, // 5 minutes
  mentionResponseDelay: {
    min: 5 * 1000,   // 5 seconds
    max: 15 * 1000   // 15 seconds
  },
  userMessageResponseDelay: {
    min: 10 * 1000,  // 10 seconds
    max: 30 * 1000   // 30 seconds
  },
  responseSpacing: {
    min: 5 * 1000,   // 5 seconds
    max: 20 * 1000   // 20 seconds
  }
};

// Get configuration based on environment
export function getConversationConfig(): ConversationConfig {
  const isDev = process.env.NODE_ENV === 'development' || process.env.FAST_MODE === 'true';
  return isDev ? devConversationConfig : defaultConversationConfig;
}