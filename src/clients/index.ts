// clients/index.ts
import { AutoClientInterface } from '@elizaos/client-auto';
// import { DiscordClientInterface } from '@elizaos/client-discord';
import { TelegramClientInterface } from '@elizaos/client-telegram';
import * as CustomTelegramClient from './telegram.js';
import { TwitterClientInterface } from '@elizaos/client-twitter';
import { Character, AgentRuntime, elizaLogger } from '@elizaos/core';
import { Telegraf } from 'telegraf';
import { ChainBotRouter } from './chainRouter.js';

// This map is used to prevent duplicate initialization.
const initializedBots: Map<string, { bot: Telegraf; characterName: string }> = new Map();

export async function initializeClients(character: Character, runtime: AgentRuntime) {
  const clients: any[] = [];
  const clientTypes = character.clients?.map((str) => str.toLowerCase()) || [];

  if (clientTypes.includes('auto')) {
    const autoClient = await AutoClientInterface.start(runtime);
    if (autoClient) clients.push(autoClient);
  }

  // Temporarily disabled Discord client.
  // if (clientTypes.includes('discord')) {
  //   clients.push(await DiscordClientInterface.start(runtime));
  // }

  if (clientTypes.includes('telegram')) {
    try {
      elizaLogger.info('Initializing Telegram client...');
      const telegramClient = await CustomTelegramClient.start(runtime).catch((error) => {
        elizaLogger.error('Telegram client start error:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
        throw error;
      });
      if (telegramClient) {
        clients.push(telegramClient);
        // Register the bot with the router.
        ChainBotRouter.getInstance().registerBot(telegramClient.character.name, telegramClient);
      }
    } catch (error) {
      elizaLogger.error('Failed to initialize Telegram client:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
  }

  if (clientTypes.includes('twitter')) {
    const twitterClients = await TwitterClientInterface.start(runtime);
    clients.push(twitterClients);
  }

  if (character.plugins?.length > 0) {
    for (const plugin of character.plugins) {
      if (plugin.clients) {
        for (const client of plugin.clients) {
          clients.push(await client.start(runtime));
        }
      }
    }
  }

  return clients;
}
