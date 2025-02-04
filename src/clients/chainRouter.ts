// chainRouter.ts
import { CustomTelegramClient } from './telegram.js';

export class ChainBotRouter {
  private static instance: ChainBotRouter;
  private botList: CustomTelegramClient[] = [];
  private currentIndex: number = 0;
  private lastResponder: string | null = null;

  private constructor() {}

  public static getInstance(): ChainBotRouter {
    if (!ChainBotRouter.instance) {
      ChainBotRouter.instance = new ChainBotRouter();
    }
    return ChainBotRouter.instance;
  }

  public registerBot(botName: string, instance: CustomTelegramClient): void {
    if (!this.botList.some((b) => b.character.name === botName)) {
      this.botList.push(instance);
      this.botList.sort((a, b) => a.character.name.localeCompare(b.character.name));
    }
  }

  public resetChain(): void {
    this.currentIndex = 0;
    this.lastResponder = null;
  }

  public recordResponse(botName: string): void {
    this.lastResponder = botName;
    if (this.botList.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.botList.length;
      if (this.botList[this.currentIndex].character.name === botName) {
        this.currentIndex = (this.currentIndex + 1) % this.botList.length;
      }
    }
  }

  public getNextBot(): CustomTelegramClient | null {
    if (this.botList.length < 2) return null;
    const candidate = this.botList[this.currentIndex];
    if (candidate.character.name === this.lastResponder) {
      this.currentIndex = (this.currentIndex + 1) % this.botList.length;
      return this.botList[this.currentIndex];
    }
    return candidate;
  }

  public getBotByName(botName: string): CustomTelegramClient | null {
    return this.botList.find((b) => b.character.name.toUpperCase() === botName.toUpperCase()) || null;
  }
}
