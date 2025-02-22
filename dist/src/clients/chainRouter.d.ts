import { CustomTelegramClient } from './telegram.js';
export declare class ChainBotRouter {
    private static instance;
    private botList;
    private currentIndex;
    private lastResponder;
    private constructor();
    static getInstance(): ChainBotRouter;
    registerBot(botName: string, instance: CustomTelegramClient): void;
    resetChain(): void;
    recordResponse(botName: string): void;
    getNextBot(): CustomTelegramClient | null;
    getBotByName(botName: string): CustomTelegramClient | null;
}
