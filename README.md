# CryptoTalk System

This software is created by using elizaOS Framework.

```bash
https://github.com/elizaOS/eliza
```

CryptoTalk Bot System is a multi‑bot conversation platform built for high-level discussions on cryptocurrency, blockchain technology, and macroeconomics. The system leverages distinct AI personas—each with detailed profiles and current achievements—to simulate a live, roundtable talk show featuring experts such as DONALD_TRUMP, ELON_MUSK, JEROME_POWELL, and WARREN_BUFFETT.

## Features

- **Direct Mention Handling**  
  When a message includes a direct mention (e.g. “@ELON_MUSK”), the corresponding bot responds immediately with a detailed, context-specific answer.

- **Continuous Conversation Chain**  
  Once a non-duplicate user message is processed, a chain loop is initiated that triggers follow-up responses from different bots at regular intervals (e.g., every 30 seconds) until a new user message arrives.

- **Distinct Crypto Talk Personas**  
  Each bot is configured with a detailed persona including recent achievements, business decisions, and public statements. The characters simulate top experts in crypto and macroeconomics.

- **Permanent Duplicate Filtering**  
  User messages are processed only once, ensuring that duplicate updates (by message ID) do not trigger multiple responses.

## Project Structure

/src
├── clients
│ ├── index.ts # Initializes and registers bot clients.
│ └── telegram.ts # Main Telegram client: handles updates, responses, and the chain loop.
└── chainRouter.ts # Router for cyclic bot-to-bot communication.

/characters
├── donald_trump.character.json # Detailed profile for DONALD_TRUMP.
├── elon_musk.character.json # Detailed profile for ELON_MUSK.
├── jerome_powell.character.json # Detailed profile for JEROME_POWELL.
└── warren_buffett.character.json # Detailed profile for WARREN_BUFFETT.

README.md # This file.
package.json # Project dependencies and scripts.

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** or **yarn** for managing dependencies
- **Environment Variables** configured for your bot tokens and API keys (e.g., OpenAI API Key)

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/cryptotalk-bot.git
   cd cryptotalk-bot
   ```

2. Install Dependencies
   Using npm:
   npm install

Or using yarn:
yarn install

3. Configure Environment Variables
   Create a .env file in the root directory with variables such as:

DISCORD_BOT_TOKEN_DONALD_TRUMP=your_discord_token_here
TELEGRAM_BOT_TOKEN_DONALD_TRUMP=your_telegram_token_here
DISCORD_BOT_TOKEN_ELON_MUSK=your_discord_token_here
TELEGRAM_BOT_TOKEN_ELON_MUSK=your_telegram_token_here
DISCORD_BOT_TOKEN_JEROME_POWELL=your_discord_token_here
TELEGRAM_BOT_TOKEN_JEROME_POWELL=your_telegram_token_here
DISCORD_BOT_TOKEN_WARREN_BUFFETT=your_discord_token_here
TELEGRAM_BOT_TOKEN_WARREN_BUFFETT=your_telegram_token_here
OPENAI_API_KEY=your_openai_api_key_here

### Running the Bot

To start the system, run:
npm start

Or, if you are using ts-node:
npx ts-node src/clients/index.ts

Once running, the bot system will connect to Telegram and (if configured) other clients. It will wait for a user message; upon receiving one, it will process it, trigger immediate direct responses for any mentions, and then continue the conversation automatically via the chain loop.

How It Works

User Message Handling
• When a new user message is received, the system checks its message ID against a permanent duplicate cache.
• If the message is new, the bot processes it, resets the conversation chain, and triggers a detailed reply based on its crypto and macroeconomic persona.
• The chain loop is then started to trigger periodic follow-up responses from the next bot in the cyclic router.

Direct Mention Responses
• If a message contains a direct “@MENTION” (e.g., “@ELON_MUSK”), the system immediately retrieves the corresponding bot using the router’s helper method.
• The mentioned bot then generates an immediate, detailed answer directly addressing the question.

Continuous Bot Shuffling
• The ChainBotRouter maintains a cyclic list of registered bots.
• Follow-up responses rotate among the bots to simulate a live discussion.
• The router also enables immediate direct responses when a mention is detected.

Customization
• Chain Loop Interval:
Adjust the interval in startChainLoop() within telegram.ts if you wish to change the frequency of follow-up responses.
• Prompt & Temperature Settings:
Modify the system prompt in getAIResponse() and adjust parameters such as temperature and max_tokens to refine response style and length.
• Character Profiles:
Update the JSON files in the /characters directory with additional details or adjustments to the personas.

Troubleshooting
• No Responses:
Verify that your environment variables are properly configured and that your tokens and API keys are valid.
• Duplicate Message Issues:
Confirm that Telegram is not sending different message IDs for repeated updates. The system uses a permanent duplicate cache to avoid multiple responses.
• Direct Mentions Not Working:
Check that the regex in processMessage() is correctly capturing mentions, and that your character names in the JSON profiles match the expected format (case-insensitive).

License

This project is licensed under the MIT License.
