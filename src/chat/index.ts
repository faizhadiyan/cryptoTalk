import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('SIGINT', () => {
  rl.close();
  process.exit(0);
});

export function startChat(characters: any[]) {
  function chat() {
    console.log('\n=================================');
    console.log('🚀 All systems initialized and ready!');
    console.log('\nActive Telegram Bots:');
    characters.forEach((character) => {
      const botId = character.settings?.secrets?.telegram?.split(':')[0];
      console.log(`✓ ${character.name} (@${botId})`);
    });
    console.log('\n💡 Send a message to any of these bots to start chatting');
    console.log('⚡ Press Ctrl+C to exit');
    console.log('=================================\n');
  }

  return chat;
}
