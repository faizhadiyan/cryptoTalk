# CryptoTalk - Human-like Conversation System

## 🚀 Overview

CryptoTalk telah diupgrade dengan sistem percakapan yang lebih humanis! Tidak lagi ada respons instan yang terkesan robotik. Sekarang bot-bot akan merespons dengan timing yang natural, seperti manusia sungguhan yang sedang berpikir dan mengetik.

## ✨ Fitur Baru

### 🤖 **Human-like Conversation System**
- **Natural Response Timing**: Bots respond with realistic delays (2-8 minutes) instead of instant replies
- **Smart Bot Selection**: Random selection based on character personality weights
- **Typing Simulation**: Shows "typing..." indicator with realistic timing
- **Cooldown Periods**: 5-minute cooldown prevents same bot from dominating conversation

### 💬 **Advanced Interaction**
- **Direct Mention Handling**: Mentioned bots (@ELON_MUSK) respond within 30 seconds - 2 minutes
- **Weighted Response System**: Each character has different activity levels:
  - **ELON_MUSK**: 35% (most active) 🚀
  - **DONALD_TRUMP**: 30% (very active) 🗣️
  - **JEROME_POWELL**: 20% (measured) 📊
  - **WARREN_BUFFETT**: 15% (most conservative) 💰

### 🎯 **Intelligent Conversation Flow**
- **Random Scheduling**: 1-3 bots scheduled to respond with varied timing
- **Context-Aware Responses**: Prompts adapt based on conversation position
- **Conversation Timeout**: Discussions naturally end after 15 minutes of inactivity

### 🔧 **Configurable Behavior**
- **Development Mode**: Faster responses (10-30 seconds) for testing
- **Production Mode**: Realistic timing for natural conversations
- **Duplicate Filtering**: Prevents processing same message multiple times

## 🎮 How It Works

### 1. User Sends Message
```
User: "What do you think about Bitcoin's recent price movement?"
```

### 2. Smart Bot Selection
- System randomly selects a bot based on personality weights
- ELON_MUSK has 35% chance, WARREN_BUFFETT has 15% chance
- Selected bot waits 2-8 minutes before responding (1-3 minutes in dev mode)

### 3. Natural Response
```
[Bot shows "typing..." for 3-5 seconds]
ELON_MUSK: "Bitcoin's volatility is fascinating! The recent dip might be a great buying opportunity for long-term holders. The fundamentals remain strong with increasing institutional adoption..."
```

### 4. Scheduled Follow-ups
- System schedules 1-3 other bots to respond
- Each with different delays (2-8 minutes apart)
- Creates natural conversation flow

### 5. Ongoing Discussion
```
[4 minutes later]
JEROME_POWELL: "From a monetary policy perspective, we need to consider the regulatory implications of crypto adoption..."

[3 minutes later]  
WARREN_BUFFETT: "I remain cautious about crypto investments. The fundamentals are still unclear compared to traditional assets..."
```

## ⚙️ Configuration

### Quick Setup for Testing
```bash
# Set environment for faster responses
export NODE_ENV=development
export FAST_MODE=true

# Start the system
npm start
```

### Production Setup
```bash
# Normal timing (2-8 minute delays)
export NODE_ENV=production
npm start
```

### Custom Configuration
Edit `src/config/conversationConfig.ts` to adjust:
- Response delays
- Character weights
- Typing simulation
- Cooldown periods

## 🧪 Testing the System

### Run Test Script
```bash
./scripts/test-conversation.sh
```

### Manual Testing
1. Send message to your Telegram bot
2. Wait for delayed response (10-30 seconds in dev mode)
3. Try mentioning specific bots: `@ELON_MUSK what do you think?`
4. Observe natural conversation flow
5. Check logs for timing information

### What to Look For
- ✅ Delayed responses (not instant)
- ✅ Random bot selection
- ✅ Typing indicators before messages
- ✅ Cooldown periods between same bot responses
- ✅ Natural conversation flow

## 📊 Character Personalities

### ELON_MUSK (35% activity) 🚀
- Most active participant
- Quick to respond to tech and innovation topics
- Playful and forward-thinking responses

### DONALD_TRUMP (30% activity) 🗣️
- Very active, bold statements
- Strong opinions on market and policy
- Direct and confident communication style

### JEROME_POWELL (20% activity) 📊
- Measured and analytical responses
- Focus on monetary policy and regulation
- Data-driven approach

### WARREN_BUFFETT (15% activity) 💰
- Most conservative participant
- Long-term investment perspective
- Cautious and fundamental analysis

## 🔍 Monitoring & Debugging

### Log Information
The system provides detailed logs for:
- Bot selection and scheduling
- Response delays and timing
- Conversation state changes
- Error handling

### Common Issues

**Bot not responding?**
- Check if bot is in cooldown period
- Verify conversation hasn't timed out (15 minutes)
- Look for error messages in logs

**Responses too fast/slow?**
- Adjust configuration in `conversationConfig.ts`
- Use environment variables for quick changes
- Restart application after config changes

**Specific bot never talks?**
- Check character weights in configuration
- Ensure bot is registered properly
- Verify cooldown status

## 🚀 Getting Started

1. **Clone and Install**
```bash
git clone <repository>
cd cryptoTalk
pnpm install
```

2. **Setup Environment**
```bash
cp .env.example .env
# Edit .env with your tokens
```

3. **Test with Fast Mode**
```bash
export NODE_ENV=development
export FAST_MODE=true
pnpm start
```

4. **Send Test Message**
- Message your Telegram bot
- Wait for delayed responses
- Try mentioning specific bots

## 📈 Benefits of New System

### ✅ More Natural
- Realistic conversation timing
- No robotic instant responses
- Human-like thinking pauses

### ✅ Better Distribution
- All characters get fair speaking time
- No single bot dominance
- Balanced conversation flow

### ✅ Unpredictable
- Random response patterns
- Varied timing
- Engaging user experience

### ✅ Configurable
- Easy to adjust for different use cases
- Development vs production modes
- Customizable character behaviors

## 🔮 Future Enhancements

- **Mood System**: Characters have varying activity based on "mood"
- **Topic Expertise**: Bots more active on their specialty topics
- **Time-based Behavior**: Different activity patterns by time of day
- **Advanced Memory**: Better context retention across conversations

---

**Ready to experience more human-like crypto discussions? Start the system and watch the magic happen!** ✨