// humanConversationManager.ts
import { elizaLogger } from '@elizaos/core';
import { CustomTelegramClient } from './telegram.js';
import { getConversationConfig, type ConversationConfig } from '../config/conversationConfig.js';

interface ConversationState {
  lastMessageTime: number;
  lastSpeaker: string | null;
  isConversationActive: boolean;
  participantCooldowns: Map<string, number>;
  messageQueue: Array<{
    botName: string;
    scheduledTime: number;
    prompt: string;
    chatId: string;
  }>;
}

export class HumanConversationManager {
  private static instance: HumanConversationManager;
  private botList: CustomTelegramClient[] = [];
  private conversationState: ConversationState;
  private processingTimer: NodeJS.Timeout | null = null;
  private config: ConversationConfig;

  private constructor() {
    this.config = getConversationConfig();
    this.conversationState = {
      lastMessageTime: 0,
      lastSpeaker: null,
      isConversationActive: false,
      participantCooldowns: new Map(),
      messageQueue: []
    };
    
    elizaLogger.info('HumanConversationManager initialized with config:', {
      minDelay: this.config.minResponseDelay / 1000 + 's',
      maxDelay: this.config.maxResponseDelay / 1000 + 's',
      cooldown: this.config.cooldownPeriod / 1000 + 's'
    });
    
    // Start the message processor
    this.startMessageProcessor();
  }

  public static getInstance(): HumanConversationManager {
    if (!HumanConversationManager.instance) {
      HumanConversationManager.instance = new HumanConversationManager();
    }
    return HumanConversationManager.instance;
  }

  public registerBot(bot: CustomTelegramClient): void {
    if (!this.botList.some(b => b.character.name === bot.character.name)) {
      this.botList.push(bot);
      elizaLogger.info(`Registered bot for human conversation: ${bot.character.name}`);
    }
  }

  public onUserMessage(chatId: string): void {
    elizaLogger.info('User message received, resetting conversation state');
    
    // Reset conversation state
    this.conversationState.lastMessageTime = Date.now();
    this.conversationState.lastSpeaker = null;
    this.conversationState.isConversationActive = true;
    this.conversationState.participantCooldowns.clear();
    this.conversationState.messageQueue = [];
    
    // Select a single bot to respond to the user message
    this.selectSingleResponder(chatId);
  }

  public onBotMessage(botName: string, chatId: string): void {
    elizaLogger.info(`Bot message from ${botName}, updating conversation state`);
    
    this.conversationState.lastMessageTime = Date.now();
    this.conversationState.lastSpeaker = botName;
    
    // Add cooldown for this bot
    this.conversationState.participantCooldowns.set(
      botName, 
      Date.now() + this.config.cooldownPeriod
    );
    
    // Always schedule follow-up responses from other bots if conversation is active
    // This ensures bots will respond to each other automatically
    if (this.conversationState.isConversationActive) {
      // Determine if we should schedule follow-up responses
      // Use a high probability (80%) to make conversations more lively
      const shouldScheduleResponses = Math.random() < 0.8;
      
      if (shouldScheduleResponses) {
        elizaLogger.info(`Scheduling follow-up responses after ${botName}'s message`);
        this.scheduleFollowUpResponses(chatId);
      } else {
        elizaLogger.info(`Not scheduling follow-ups after ${botName}'s message (random decision)`);
      }
    }
  }

  // Method for scheduling follow-up responses from other bots
  private scheduleFollowUpResponses(chatId: string): void {
    const now = Date.now();
    const availableBots = this.getAvailableBots();
    
    if (availableBots.length === 0) {
      elizaLogger.info('No available bots for scheduling follow-up responses');
      return;
    }

    // Determine how many bots should respond (more dynamic conversation)
    // Use a weighted random approach to sometimes have more bots respond
    let numResponsesToSchedule;
    const randomFactor = Math.random();
    
    if (randomFactor < 0.3) {
      // 30% chance: Schedule just 1 response
      numResponsesToSchedule = 1;
    } else if (randomFactor < 0.7) {
      // 40% chance: Schedule 2 responses
      numResponsesToSchedule = 2;
    } else if (randomFactor < 0.9) {
      // 20% chance: Schedule 3 responses
      numResponsesToSchedule = 3;
    } else {
      // 10% chance: Schedule all available bots (lively discussion)
      numResponsesToSchedule = availableBots.length;
    }
    
    // Ensure we don't schedule more responses than available bots
    const numResponses = Math.min(numResponsesToSchedule, availableBots.length);
    elizaLogger.info(`Scheduling ${numResponses} follow-up responses from available bots`);
    
    let lastScheduledTime = now;

    for (let i = 0; i < numResponses; i++) {
      const randomBot = this.selectRandomBot(availableBots);
      if (!randomBot) continue;

      // Remove selected bot from available list to avoid immediate duplicates
      const botIndex = availableBots.findIndex(b => b.character.name === randomBot.character.name);
      if (botIndex > -1) {
        availableBots.splice(botIndex, 1);
      }

      // Create more varied and natural timing between responses
      let delay;
      
      if (i === 0) {
        // First response comes quicker (someone eager to respond)
        delay = Math.floor(Math.random() * 
          (this.config.responseSpacing.max / 2 - this.config.responseSpacing.min / 2)) + 
          this.config.responseSpacing.min / 2;
      } else {
        // Subsequent responses have more varied timing
        const baseDelay = Math.floor(Math.random() * 
          (this.config.maxResponseDelay - this.config.minResponseDelay)) + 
          this.config.minResponseDelay;
          
        // Add some randomness to make it feel more natural
        const variability = Math.random() * 2000; // +/- 2 seconds of randomness
        delay = baseDelay + (i * this.config.responseSpacing.min) + variability;
      }
      
      const scheduledTime = lastScheduledTime + delay;
      lastScheduledTime = scheduledTime;

      // Create more varied and contextual prompts
      const promptTypes = ['agreement', 'disagreement', 'question', 'elaboration', 'joke'];
      const promptType = promptTypes[Math.floor(Math.random() * promptTypes.length)];
      const prompt = this.generateEnhancedPrompt(randomBot.character.name, i, promptType);

      this.conversationState.messageQueue.push({
        botName: randomBot.character.name,
        scheduledTime,
        prompt,
        chatId
      });

      elizaLogger.info(
        `Scheduled ${promptType} response from ${randomBot.character.name} in ${Math.round(delay / 1000)}s`
      );
    }

    // Sort queue by scheduled time
    this.conversationState.messageQueue.sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  private getAvailableBots(): CustomTelegramClient[] {
    const now = Date.now();
    return this.botList.filter(bot => {
      const cooldownEnd = this.conversationState.participantCooldowns.get(bot.character.name) || 0;
      const isNotLastSpeaker = bot.character.name !== this.conversationState.lastSpeaker;
      const isNotInCooldown = now >= cooldownEnd;
      
      return isNotLastSpeaker && isNotInCooldown;
    });
  }

  private selectRandomBot(availableBots: CustomTelegramClient[]): CustomTelegramClient | null {
    if (availableBots.length === 0) return null;
    
    // Weight selection based on character traits from config
    const weights = availableBots.map(bot => {
      const configWeight = this.config.characterWeights[bot.character.name] || 0.25;
      // Convert response probability to selection weight
      return configWeight * 3; // Scale up for better distribution
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableBots.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return availableBots[i];
      }
    }

    return availableBots[availableBots.length - 1];
  }

  private generateContextualPrompt(botName: string, responseIndex: number): string {
    const prompts = {
      initial: [
        "Share your perspective on the current discussion",
        "Add your insights to the conversation",
        "What's your take on this topic?",
        "Contribute your expertise to this discussion"
      ],
      followUp: [
        "Build upon the previous points made",
        "Respond to the ongoing conversation",
        "Share additional thoughts on this matter",
        "Continue the discussion with your viewpoint"
      ],
      deep: [
        "Provide a deeper analysis of the situation",
        "Offer a more detailed perspective",
        "Elaborate on the implications discussed",
        "Give a comprehensive view on this topic"
      ]
    };

    let promptCategory: keyof typeof prompts;
    if (responseIndex === 0) {
      promptCategory = 'initial';
    } else if (responseIndex === 1) {
      promptCategory = 'followUp';
    } else {
      promptCategory = 'deep';
    }

    const categoryPrompts = prompts[promptCategory];
    const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
    
    return `[${randomPrompt}. Respond naturally as ${botName} without mentioning your own name.]`;
  }
  
  private generateEnhancedPrompt(botName: string, responseIndex: number, promptType: string): string {
    // Different types of prompts for more varied and natural conversation
    const prompts = {
      agreement: [
        "You generally agree with the previous point. Add your supportive perspective.",
        "Build on what was just said with your own supporting evidence or examples.",
        "Express agreement with the previous speaker and expand on their point.",
        "You think the previous speaker made a good point. Elaborate on why you agree."
      ],
      disagreement: [
        "You disagree with aspects of what was just said. Explain your different perspective.",
        "Challenge the previous point with your contrasting viewpoint.",
        "Politely disagree and offer an alternative perspective on this topic.",
        "You see things differently. Present your counterargument respectfully."
      ],
      question: [
        "Ask a thought-provoking question about what was just discussed.",
        "Pose a challenging question that explores the implications of the previous point.",
        "Request clarification or more details about the previous statement.",
        "Raise an important question that shifts the conversation in a new direction."
      ],
      elaboration: [
        "Elaborate on the topic with additional technical or economic insights.",
        "Provide more depth on this subject from your unique perspective.",
        "Share a relevant anecdote or example that illustrates the current topic.",
        "Expand the conversation by connecting this topic to broader trends or implications."
      ],
      joke: [
        "Make a witty or humorous comment related to the discussion.",
        "Add a touch of humor while still making a substantive point.",
        "Share a clever analogy or metaphor that lightens the mood but adds value.",
        "Make a playful remark that's still relevant to the cryptocurrency discussion."
      ]
    };
    
    // Select a random prompt from the chosen type
    const typePrompts = prompts[promptType as keyof typeof prompts] || prompts.elaboration;
    const randomPrompt = typePrompts[Math.floor(Math.random() * typePrompts.length)];
    
    // Add character-specific instructions based on their personality
    let characterInstruction = "";
    
    switch(botName) {
      case "ELON_MUSK":
        characterInstruction = "Be innovative, slightly irreverent, and forward-thinking.";
        break;
      case "DONALD_TRUMP":
        characterInstruction = "Be bold, confident, and use simple, direct language.";
        break;
      case "JEROME_POWELL":
        characterInstruction = "Be measured, data-driven, and cautious in your analysis.";
        break;
      case "WARREN_BUFFETT":
        characterInstruction = "Be conservative, value-focused, and use folksy wisdom.";
        break;
      default:
        characterInstruction = "Maintain your unique personality and expertise.";
    }
    
    return `[${randomPrompt} ${characterInstruction} Respond naturally as yourself without mentioning your own name.]`;
  }

  private startMessageProcessor(): void {
    this.processingTimer = setInterval(() => {
      this.processScheduledMessages();
      this.checkConversationTimeout();
    }, 10000); // Check every 10 seconds
  }

  private async processScheduledMessages(): Promise<void> {
    const now = Date.now();
    const readyMessages = this.conversationState.messageQueue.filter(
      msg => msg.scheduledTime <= now
    );

    for (const message of readyMessages) {
      try {
        const bot = this.botList.find(b => b.character.name === message.botName);
        if (bot && this.conversationState.isConversationActive) {
          elizaLogger.info(`Processing scheduled message from ${message.botName}`);
          
          // Send the message through the bot
          await this.sendBotMessage(bot, message.prompt, message.chatId);
          
          // Update conversation state
          this.onBotMessage(message.botName, message.chatId);
        }
      } catch (error) {
        elizaLogger.error(`Error processing scheduled message from ${message.botName}:`, error);
      }

      // Remove processed message from queue
      const index = this.conversationState.messageQueue.indexOf(message);
      if (index > -1) {
        this.conversationState.messageQueue.splice(index, 1);
      }
    }
  }

  private async sendBotMessage(bot: CustomTelegramClient, prompt: string, chatId: string): Promise<void> {
    try {
      // Use the bot's AI response method
      const response = await bot.getAIResponse(prompt, chatId);
      
      // Send typing indicator for realism
      await bot.bot.telegram.sendChatAction(chatId, 'typing');
      
      // Add typing simulation delay if enabled
      if (this.config.typingSimulation.enabled) {
        const typingDelay = Math.min(
          response.length * this.config.typingSimulation.baseDelay,
          this.config.typingSimulation.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, typingDelay));
      }
      
      // Send the message
      await bot.bot.telegram.sendMessage(chatId, response);
      
      elizaLogger.info(`${bot.character.name} sent scheduled message: ${response.substring(0, 100)}...`);
    } catch (error) {
      elizaLogger.error(`Error sending message from ${bot.character.name}:`, error);
    }
  }

  private checkConversationTimeout(): void {
    const now = Date.now();
    const timeSinceLastMessage = now - this.conversationState.lastMessageTime;
    
    if (this.conversationState.isConversationActive && timeSinceLastMessage > this.config.conversationTimeout) {
      elizaLogger.info('Conversation timed out, ending active discussion');
      this.conversationState.isConversationActive = false;
      this.conversationState.messageQueue = [];
    }
  }
  
  private selectSingleResponder(chatId: string): void {
    const availableBots = this.getAvailableBots();
    
    if (availableBots.length === 0) {
      elizaLogger.info('No available bots to respond to user message');
      return;
    }
    
    // Select a single bot to respond based on weights
    const selectedBot = this.selectRandomBot(availableBots);
    if (!selectedBot) {
      elizaLogger.info('Failed to select a bot to respond');
      return;
    }
    
    elizaLogger.info(`Selected ${selectedBot.character.name} to respond to user message`);
    
    // Calculate a faster response delay for initial responses
    // Make initial responses much quicker (1-3 seconds) for better user experience
    const config = getConversationConfig();
    const responseDelay = Math.random() * 2000 + 1000; // 1-3 seconds
    
    // Determine the type of response based on the bot's personality
    let promptType = 'initial';
    
    // Add some personality-based variation to the first response
    switch(selectedBot.character.name) {
      case "ELON_MUSK":
        // Elon is more likely to make jokes or be contrarian
        promptType = Math.random() < 0.4 ? 'joke' : 'elaboration';
        break;
      case "DONALD_TRUMP":
        // Trump is more likely to be bold and direct
        promptType = Math.random() < 0.6 ? 'disagreement' : 'elaboration';
        break;
      case "JEROME_POWELL":
        // Powell is more measured and analytical
        promptType = Math.random() < 0.7 ? 'elaboration' : 'question';
        break;
      case "WARREN_BUFFETT":
        // Buffett is more conservative and wisdom-focused
        promptType = Math.random() < 0.5 ? 'agreement' : 'elaboration';
        break;
      default:
        promptType = 'elaboration';
    }
    
    // Schedule only this bot to respond with an enhanced prompt
    const prompt = this.generateEnhancedPrompt(selectedBot.character.name, 0, promptType);
    const scheduledTime = Date.now() + responseDelay;
    
    this.conversationState.messageQueue.push({
      botName: selectedBot.character.name,
      scheduledTime,
      prompt,
      chatId
    });
    
    elizaLogger.info(
      `Scheduled initial ${promptType} response from ${selectedBot.character.name} in ${Math.round(responseDelay / 1000)}s`
    );
    
    // After this bot responds, follow-up responses will be scheduled in onBotMessage
  }

  public getBotByName(botName: string): CustomTelegramClient | null {
    return this.botList.find(b => 
      b.character.name.toUpperCase() === botName.toUpperCase()
    ) || null;
  }

  public stopConversation(): void {
    elizaLogger.info('Manually stopping conversation');
    this.conversationState.isConversationActive = false;
    this.conversationState.messageQueue = [];
  }

  public destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    this.conversationState.isConversationActive = false;
    this.conversationState.messageQueue = [];
  }
}