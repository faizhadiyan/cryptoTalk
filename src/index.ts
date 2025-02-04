import { AgentRuntime, elizaLogger, settings, stringToUuid, type Character, type IMemoryManager } from '@elizaos/core';
import { bootstrapPlugin } from '@elizaos/plugin-bootstrap';
import { createNodePlugin } from '@elizaos/plugin-node';
import { solanaPlugin } from '@elizaos/plugin-solana';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDbCache } from './cache/index.ts';
import { character } from './character.ts';
import { startChat } from './chat/index.ts';
import { initializeClients } from './clients/index.ts';
import { getTokenForProvider, loadCharacters, parseArguments } from './config/index.ts';
import { initializeDatabase } from './database/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
  const waitTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};

let nodePlugin: any | undefined;

export function createAgent(character: Character, db: any, cache: any, token: string) {
  elizaLogger.success(elizaLogger.successesTitle, 'Creating runtime for character', character.name);

  nodePlugin ??= createNodePlugin();

  // Create runtime with all required services and managers
  return new AgentRuntime({
    databaseAdapter: db,
    cacheManager: cache,
    plugins: [bootstrapPlugin, nodePlugin, character.settings?.secrets?.WALLET_PUBLIC_KEY ? solanaPlugin : null].filter(Boolean),
    character,
    token,
    modelProvider: character.modelProvider,
    services: [], // Let runtime create default services
    providers: [],
    actions: [],
    evaluators: [],
    managers: [], // Let runtime create default managers
  });
}

async function startAgent(character: Character) {
  try {
    console.log('\n🔄 Initializing', character.name, '...');

    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);
    const dataDir = path.join(__dirname, '../data');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('📦 Setting up database...');
    const db = initializeDatabase(dataDir);
    await db.init();

    const cache = initializeDbCache(character, db);
    const runtime = createAgent(character, db, cache, token);

    console.log('🔌 Initializing core services...');
    await runtime.initialize();

    console.log('🤖 Starting Telegram client...');
    runtime.clients = await initializeClients(character, runtime);

    elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);
    return runtime;
  } catch (error) {
    elizaLogger.error(elizaLogger.errorsTitle, 'Error starting agent:', character.name, error);
    throw error;
  }
}

// Function to handle bot-to-bot communication
function chatWithOtherBots(message: string) {
  // Logic to send message to other bots
  // For example, using a messaging API or internal logic
  console.log('Bot-to-bot communication:', message);
}

let userMessageSent = false;

// Modify existing message handling logic
function handleUserMessage(userMessage: string) {
  if (!userMessageSent) {
    // Process user message
    userMessageSent = true; // Set flag to prevent further messages
    chatWithOtherBots(userMessage); // Allow bot to chat with other bots
  } else {
    console.log('User can only send one message.');
  }
}

const startAgents = async () => {
  const args = parseArguments();
  let characters = [];

  try {
    if (args.characters || args.character) {
      // If specific characters are provided via arguments, use those
      const charactersArg = args.characters || args.character;
      characters = await loadCharacters(charactersArg);
    } else {
      // Load all character files from the characters directory
      const charactersDir = path.join(__dirname, '../characters');
      const characterFiles = fs
        .readdirSync(charactersDir)
        .filter((file) => file.endsWith('.character.json'))
        .map((file) => path.basename(file, '.character.json').toUpperCase());

      // Load all characters using the same loadCharacters function
      characters = await loadCharacters(characterFiles.join(','));
    }

    if (characters.length === 0) {
      elizaLogger.warn('No characters loaded, falling back to default Eliza character');
      characters = [character];
    }

    console.log('Starting bots:', characters.map((c) => c.name).join(', '));

    const startedCharacters = [];
    for (const character of characters) {
      console.log(`\nStarting bot: ${character.name}`);
      await startAgent(character);
      startedCharacters.push(character);

      if (characters.indexOf(character) < characters.length - 1) {
        console.log(`Waiting 2 seconds before starting next bot...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Show status of all running bots
    const chat = startChat(startedCharacters);
    chat();
  } catch (error) {
    elizaLogger.error('Error starting agent:', error);
    process.exit(1);
  }
};

startAgents().catch((error) => {
  elizaLogger.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
