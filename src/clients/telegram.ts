// telegram.ts
import { elizaLogger, Memory, Character, IAgentRuntime, stringToUuid } from '@elizaos/core';
import { TelegramClientInterface } from '@elizaos/client-telegram';
import { Telegraf, Context } from 'telegraf';
import { Update, Message, UserFromGetMe } from 'telegraf/types';
import { OpenAI } from 'openai';
import { ChainBotRouter } from './chainRouter.js';
import { createHash } from 'crypto';

// Global set for processed user message IDs (permanent)
const processedUpdates = new Set<number>();

export class CustomTelegramClient {
  // Use a Set so that each user message (by message ID) is processed only once.
  private processedUserMessages = new Set<number>();
  private bot: Telegraf;
  private runtime: IAgentRuntime;
  public character: Character;
  private startTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private openai: OpenAI;
  // Optional: a hash-based duplicate map (if needed for extra safety)
  private processedMessages: Map<string, { timestamp: number; isBot: boolean; messageId: number }> = new Map();
  // Timer for the continuous chain loop
  private chainLoopTimer: NodeJS.Timeout | null = null;

  constructor(token: string, runtime: IAgentRuntime, character: Character) {
    elizaLogger.info('Creating Telegram client for character:', character.name);
    elizaLogger.info('Token prefix:', token.substring(0, 10) + '...');
    this.bot = new Telegraf(token);
    this.runtime = runtime;
    this.character = character;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Cleanup processedMessages every 10 seconds (do not clear processedUserMessages)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, metadata] of this.processedMessages.entries()) {
        if (now - metadata.timestamp > 1000) {
          this.processedMessages.delete(key);
        }
      }
    }, 10000);
  }

  private cleanupProcessedUpdates() {
    if (processedUpdates.size > 1000) {
      const toRemove = Array.from(processedUpdates).slice(0, processedUpdates.size - 1000);
      toRemove.forEach((id) => processedUpdates.delete(id));
    }
  }

  async start() {
    elizaLogger.info('Starting Telegram client for:', this.character.name);
    const timeoutPromise = new Promise((_, reject) => {
      this.startTimeout = setTimeout(() => {
        reject(new Error('Telegram client initialization timed out after 120 seconds'));
      }, 120000);
    });
    try {
      const connected = await this.testConnection();
      if (!connected) throw new Error('Failed to connect to Telegram API');
      const result = await Promise.race([this.initializeBot(), timeoutPromise]);
      if (this.startTimeout) clearTimeout(this.startTimeout);
      return result;
    } catch (error) {
      elizaLogger.error('Error starting Telegram client for:', this.character.name, {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      elizaLogger.info('Testing connection to api.telegram.org...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('https://api.telegram.org', { signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (response.ok) {
        elizaLogger.info('Connection to Telegram API successful');
        return true;
      } else {
        elizaLogger.error('Connection to Telegram API failed:', response.status);
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        elizaLogger.error('Connection to Telegram API timed out after 10 seconds');
      } else {
        elizaLogger.error('Network error testing Telegram API:', error);
      }
      return false;
    }
  }

  private async initializeBot(): Promise<boolean> {
    try {
      elizaLogger.info('Starting bot initialization steps...');
      // Step 1: Test bot token.
      elizaLogger.info('Step 1: Testing bot token...');
      const botInfo = (await Promise.race([this.bot.telegram.getMe(), new Promise((_, reject) => setTimeout(() => reject(new Error('GetMe timeout after 30s')), 30000))])) as UserFromGetMe;
      elizaLogger.info('Bot info retrieved successfully:', botInfo);

      // Step 2: Delete webhook.
      elizaLogger.info('Step 2: Deleting webhook...');
      await Promise.race([this.bot.telegram.deleteWebhook({ drop_pending_updates: true }), new Promise((_, reject) => setTimeout(() => reject(new Error('DeleteWebhook timeout after 30s')), 30000))]);
      elizaLogger.info('Webhook deleted successfully');

      // Step 3: Set up message handler.
      elizaLogger.info('Step 3: Setting up message handler...');
      this.bot.on('message', async (ctx) => {
        if (this.isInitialized && 'text' in ctx.message) {
          const isBot = ctx.message.from?.is_bot || false;
          const senderName = ctx.message.from?.first_name || ctx.message.from?.username || 'unknown';
          elizaLogger.info(`Received ${isBot ? 'bot' : 'user'} message from ${senderName}:`, ctx.message.text);
          // Process user messages or messages from other bots.
          if (!isBot || (isBot && ctx.message.from && botInfo && ctx.message.from.id !== botInfo.id)) {
            await this.processMessage(ctx.message, ctx);
          }
        }
      });
      elizaLogger.info('Message handler set up successfully');

      // Step 4: Launch bot (manual polling).
      elizaLogger.info('Step 4: Launching bot...');
      this.bot.catch((error) => {
        elizaLogger.error('Bot error caught:', error);
      });
      await this.bot.telegram.deleteWebhook();
      let offset = 0;
      const pollOptions = { timeout: 30, limit: 100 };
      const poll = async () => {
        try {
          const updates = await this.bot.telegram.getUpdates(offset, pollOptions.limit, pollOptions.timeout, ['message']);
          if (updates.length > 0) {
            offset = updates[updates.length - 1].update_id + 1;
            for (const update of updates) {
              if ('message' in update && 'text' in update.message) {
                await this.bot.handleUpdate(update);
              }
            }
          }
        } catch (error) {
          elizaLogger.error('Polling error:', error);
        }
        setTimeout(poll, 100);
      };
      poll();
      elizaLogger.info('Successfully started receiving updates');
      this.isInitialized = true;

      console.log('\n=================================');
      console.log(`🤖 ${this.character.name} bot is now ONLINE!`);
      console.log(`Bot Username: @${botInfo.username}`);
      console.log('Send a message to your bot to start chatting');
      console.log('=================================\n');
      return true;
    } catch (error) {
      elizaLogger.error('Bot initialization error:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
  }

  // Create a hash for deduplication. For bot messages, append Date.now() for uniqueness.
  private createMessageHash(message: Update.New & Update.NonChannel & Message.TextMessage): string {
    if (message.from?.is_bot) {
      return createHash('sha256').update(`${message.chat.id}-${message.from?.id}-${message.text}-${message.date}-${Date.now()}`).digest('hex');
    } else {
      return createHash('sha256').update(`${message.chat.id}-${message.from?.id}-${message.text}-${message.date}`).digest('hex');
    }
  }

  private async getRecentMessages(roomId: string, count: number = 5): Promise<Memory[]> {
    try {
      const memories = await this.runtime.messageManager.getMemories({
        roomId: stringToUuid(roomId),
        count: count,
      });
      return memories;
    } catch (error) {
      elizaLogger.error('Error fetching recent messages:', error);
      return [];
    }
  }

  private async getAIResponse(message: string, chatId: string): Promise<string> {
    try {
      const characterPrompt = `You are ${this.character.name}.
You are a crypto and macroeconomics expert with a highly detailed persona.
Your style is: ${this.character.style?.all?.join(', ') || 'pragmatic, incisive, and analytical'}.
Your interests include: ${this.character.topics?.join(', ') || 'cryptocurrency, blockchain technology, market trends, macroeconomic policy, and fiscal analysis'}.
You are participating in a high-level discussion with top experts: DONALD_TRUMP, ELON_MUSK, JEROME_POWELL, and WARREN_BUFFETT.
Each has a distinctive personality:
- DONALD_TRUMP is bold and unapologetic, advocating deregulation and market freedom.
- ELON_MUSK is innovative and irreverent, blending technical insight with playful futurism.
- JEROME_POWELL is measured and data-driven, offering cautious analysis.
- WARREN_BUFFETT is conservative and disciplined, emphasizing long-term fundamentals.
IMPORTANT RULES:
1. Respond directly to any message addressed to you. Do NOT mention your own name in your reply.
2. Provide detailed analysis that directly relates to the question asked.
3. Your answer should reflect a high-level, Ivy League–style discussion on crypto and macroeconomics.
For example, if DONALD_TRUMP discusses deregulation, provide analysis on its impact on crypto markets and economic trends.`;

      const recentMessages = await this.getRecentMessages(chatId);
      const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = recentMessages
        .map((memory: Memory) => {
          const userName = memory?.content?.userName || 'unknown';
          const metadata = memory?.content?.metadata as { isBot: boolean; botName?: string };
          const isBot = Boolean(metadata?.isBot);
          const botName = metadata?.botName || 'Bot';
          const messageText = memory?.content?.text || '';
          if (isBot) {
            return {
              role: 'assistant' as const,
              content: `${botName} (Expert): ${messageText}`,
              name: userName,
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
          } else {
            return {
              role: 'user' as const,
              content: `User ${userName}: ${messageText}`,
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
          }
        })
        .reverse();

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: 'system' as const, content: characterPrompt }, ...conversationHistory, { role: 'user' as const, content: message }];

      const completion = await this.openai.chat.completions.create({
        messages,
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        max_tokens: 500,
      });
      return completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at the moment.";
    } catch (error) {
      elizaLogger.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Start a continuous chain loop that triggers follow-up responses every 30 seconds.
  private startChainLoop(chatId: string): void {
    // Clear any existing loop.
    if (this.chainLoopTimer) {
      clearInterval(this.chainLoopTimer);
    }
    const chainRouter = ChainBotRouter.getInstance();
    this.chainLoopTimer = setInterval(async () => {
      const nextBot = chainRouter.getNextBot();
      if (nextBot && nextBot.character.name !== this.character.name) {
        const followUpPrompt = `[Generate a continuous follow-up response addressing ${nextBot.character.name} on the crypto topic in detail]`;
        try {
          const followUpResponse = await nextBot.getAIResponse(followUpPrompt, chatId);
          await this.bot.telegram.sendMessage(chatId, `@${nextBot.character.name} ${followUpResponse}`);
          chainRouter.recordResponse(nextBot.character.name);
        } catch (err) {
          elizaLogger.error('Error in chain loop:', err);
        }
      }
    }, 30000);
  }

  private stopChainLoop(): void {
    if (this.chainLoopTimer) {
      clearInterval(this.chainLoopTimer);
      this.chainLoopTimer = null;
    }
  }

  // Process incoming messages.
  private async processMessage(message: Update.New & Update.NonChannel & Message.TextMessage, ctx: Context) {
    try {
      const messageId = message.message_id;
      const isFromUser = !message.from?.is_bot;
      const chatId = message.chat.id.toString();
      const chainRouter = ChainBotRouter.getInstance();

      // Check for direct mention using a case-insensitive regex.
      let mentionedBotName: string | null = null;
      if (message.text) {
        const matches = message.text.match(/@([\w]+)/gi);
        if (matches) {
          for (const match of matches) {
            const candidate = match.substring(1); // Remove '@'
            if (candidate.toUpperCase() !== this.character.name.toUpperCase()) {
              mentionedBotName = candidate;
              break;
            }
          }
          if (mentionedBotName) {
            elizaLogger.info(`Direct mention detected: ${mentionedBotName} in message: "${message.text}"`);
          }
        }
      }

      // For user messages:
      if (isFromUser) {
        // Process only if this message is not a duplicate (unless it has a direct mention).
        if (!mentionedBotName && this.processedUserMessages.has(messageId)) {
          elizaLogger.info(`Bot ${this.character.name} skipping duplicate user message with ID:`, messageId);
          return;
        }
        if (!mentionedBotName) {
          this.processedUserMessages.add(messageId);
        }

        // Reset chain and stop any existing chain loop.
        chainRouter.resetChain();
        this.stopChainLoop();

        // Process the user message.
        const aiResponse = await this.getAIResponse(message.text || '', chatId);
        await ctx.sendChatAction('typing');
        const botReply = await ctx.reply(aiResponse, {
          reply_parameters: {
            message_id: message.message_id,
            chat_id: message.chat.id,
            allow_sending_without_reply: true,
          },
        });
        elizaLogger.info(`Bot ${this.character.name} replied to user:`, aiResponse);
        chainRouter.recordResponse(this.character.name);

        // If there is no direct mention in the user message, trigger an immediate follow-up.
        if (!mentionedBotName) {
          const nextBot = chainRouter.getNextBot();
          if (nextBot && nextBot.character.name !== this.character.name) {
            const followUpPrompt = `[Generate a follow-up response addressing ${nextBot.character.name} based on the previous reply]`;
            const followUpResponse = await nextBot.getAIResponse(followUpPrompt, chatId);
            await ctx.sendChatAction('typing');
            await ctx.reply(`@${nextBot.character.name} ${followUpResponse}`, {
              reply_parameters: {
                message_id: botReply.message_id,
                chat_id: message.chat.id,
                allow_sending_without_reply: true,
              },
            });
            chainRouter.recordResponse(nextBot.character.name);
          }
        }
        // Start the continuous chain loop.
        this.startChainLoop(chatId);
      } else {
        // For bot-to-bot messages:
        if (mentionedBotName) {
          const targetBot = chainRouter.getBotByName(mentionedBotName);
          if (targetBot) {
            const aiResponse = await targetBot.getAIResponse(`[Directly answer this question: "${message.text}"]`, chatId);
            await ctx.sendChatAction('typing');
            await ctx.reply(`@${targetBot.character.name} ${aiResponse}`, {
              reply_parameters: {
                message_id: message.message_id,
                chat_id: message.chat.id,
                allow_sending_without_reply: true,
              },
            });
            chainRouter.recordResponse(targetBot.character.name);
            return;
          } else {
            elizaLogger.info(`No registered bot found for mention: ${mentionedBotName}`);
          }
        }
        // Fallback: if no direct mention, use chance-based response.
        if (Math.random() < 0.3) {
          const aiResponse = await this.getAIResponse(`[Respond to the conversation]`, chatId);
          await ctx.sendChatAction('typing');
          const botReply = await ctx.reply(aiResponse, {
            reply_parameters: {
              message_id: message.message_id,
              chat_id: message.chat.id,
              allow_sending_without_reply: true,
            },
          });
          chainRouter.recordResponse(this.character.name);
          const nextBot = chainRouter.getNextBot();
          if (nextBot && nextBot.character.name !== this.character.name) {
            const followUpPrompt = `[Generate a follow-up response addressing ${nextBot.character.name}]`;
            const followUpResponse = await nextBot.getAIResponse(followUpPrompt, chatId);
            await ctx.sendChatAction('typing');
            await ctx.reply(`@${nextBot.character.name} ${followUpResponse}`, {
              reply_parameters: {
                message_id: botReply.message_id,
                chat_id: message.chat.id,
                allow_sending_without_reply: true,
              },
            });
            chainRouter.recordResponse(nextBot.character.name);
          }
        }
      }
    } catch (error) {
      elizaLogger.error('Error processing message:', error);
    }
  }

  async stop() {
    elizaLogger.info('Stopping Telegram client for:', this.character.name);
    if (this.startTimeout) clearTimeout(this.startTimeout);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.chainLoopTimer) clearInterval(this.chainLoopTimer);
    await this.bot.stop();
  }
}

// Export the start function for external use.
export async function start(runtime: IAgentRuntime) {
  const token = runtime.character.settings?.secrets?.telegram;
  if (!token) {
    throw new Error(`No Telegram token provided for character: ${runtime.character.name}`);
  }
  elizaLogger.info('Starting Telegram client initialization for:', runtime.character.name);
  const client = new CustomTelegramClient(token, runtime, runtime.character);
  const success = await client.start();
  if (!success) {
    throw new Error(`Failed to start Telegram client for: ${runtime.character.name}`);
  }
  return client;
}
