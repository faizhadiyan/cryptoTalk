#!/bin/bash

# Test script for human conversation system

echo "🤖 CryptoTalk Human Conversation System Test"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Set development mode for faster testing
export NODE_ENV=development
export FAST_MODE=true

echo "📝 Configuration:"
echo "   - Mode: Development (faster responses)"
echo "   - Response delay: 10-30 seconds"
echo "   - Mention delay: 5-15 seconds"
echo "   - Cooldown: 30 seconds"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build the project
echo "🔨 Building project..."
pnpm run build

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Please create .env file with your bot tokens:"
    echo "   TELEGRAM_BOT_TOKEN_ELON_MUSK=your_token_here"
    echo "   TELEGRAM_BOT_TOKEN_DONALD_TRUMP=your_token_here"
    echo "   TELEGRAM_BOT_TOKEN_JEROME_POWELL=your_token_here"
    echo "   TELEGRAM_BOT_TOKEN_WARREN_BUFFETT=your_token_here"
    echo "   OPENAI_API_KEY=your_openai_key_here"
    echo ""
    echo "   For testing, you can use the same token for all bots"
    echo ""
fi

echo "🚀 Starting CryptoTalk with Human Conversation System..."
echo ""
echo "📋 Test Instructions:"
echo "   1. Send a message to your Telegram bot"
echo "   2. Wait for delayed responses (10-30 seconds in dev mode)"
echo "   3. Try mentioning specific bots: @ELON_MUSK, @DONALD_TRUMP, etc."
echo "   4. Observe the natural conversation flow"
echo "   5. Check logs for timing and bot selection info"
echo ""
echo "🔍 What to look for:"
echo "   ✅ Delayed responses (not instant)"
echo "   ✅ Random bot selection"
echo "   ✅ Typing indicators before messages"
echo "   ✅ Cooldown periods between same bot responses"
echo "   ✅ Natural conversation flow"
echo ""
echo "Press Ctrl+C to stop the test"
echo "==========================================="
echo ""

# Start the application
pnpm start