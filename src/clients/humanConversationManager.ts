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
    
    // Schedule follow-up responses from other bots if conversation is still active
    if (this.conversationState.isConversationActive) {
      this.scheduleFollowUpResponses(chatId);
    }
  }

  // This method is now only used for follow-up responses after a bot has responded
  private scheduleFollowUpResponses(chatId: string): void {
    const now = Date.now();
    const availableBots = this.getAvailableBots();
    
    if (availableBots.length === 0) {
      elizaLogger.info('No available bots for scheduling follow-up responses');
      return;
    }

    // Schedule 1-3 random responses
    const numResponses = Math.min(
      Math.floor(Math.random() * this.config.maxScheduledResponses) + 1,
      availableBots.length
    );
    let lastScheduledTime = now;

    for (let i = 0; i < numResponses; i++) {
      const randomBot = this.selectRandomBot(availableBots);
      if (!randomBot) continue;

      // Remove selected bot from available list to avoid immediate duplicates
      const botIndex = availableBots.findIndex(b => b.character.name === randomBot.character.name);
      if (botIndex > -1) {
        availableBots.splice(botIndex, 1);
      }

      // Calculate random delay with spacing
      const baseDelay = Math.floor(Math.random() * 
        (this.config.maxResponseDelay - this.config.minResponseDelay)) + this.config.minResponseDelay;
      const spacing = Math.floor(Math.random() * 
        (this.config.responseSpacing.max - this.config.responseSpacing.min)) + this.config.responseSpacing.min;
      
      const delay = baseDelay + (i * spacing);
      const scheduledTime = lastScheduledTime + delay;
      lastScheduledTime = scheduledTime;

      // Create contextual prompt based on conversation flow
      const prompt = this.generateContextualPrompt(randomBot.character.name, i);

      this.conversationState.messageQueue.push({
        botName: randomBot.character.name,
        scheduledTime,
        prompt,
        chatId
      });

      elizaLogger.info(
        `Scheduled follow-up response from ${randomBot.character.name} in ${Math.round(delay / 1000)}s`
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
    
    // Calculate response delay
    const config = getConversationConfig();
    const responseDelay = Math.random() * 
      (config.userMessageResponseDelay.max - config.userMessageResponseDelay.min) + 
      config.userMessageResponseDelay.min;
    
    // Schedule only this bot to respond
    const prompt = this.generateContextualPrompt(selectedBot.character.name, 0);
    const scheduledTime = Date.now() + responseDelay;
    
    this.conversationState.messageQueue.push({
      botName: selectedBot.character.name,
      scheduledTime,
      prompt,
      chatId
    });
    
    elizaLogger.info(
      `Scheduled single response from ${selectedBot.character.name} in ${Math.round(responseDelay / 1000)}s`
    );
    
    // After this bot responds, we'll schedule follow-up responses from other bots
    // This happens in the onBotMessage method
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