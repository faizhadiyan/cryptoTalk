import { Character, IAgentRuntime } from '@elizaos/core';
export declare class CustomTelegramClient {
    private processedUserMessages;
    private bot;
    private runtime;
    character: Character;
    private startTimeout;
    private isInitialized;
    private cleanupInterval;
    private openai;
    private processedMessages;
    private chainLoopTimer;
    constructor(token: string, runtime: IAgentRuntime, character: Character);
    private cleanupProcessedUpdates;
    start(): Promise<unknown>;
    private testConnection;
    private initializeBot;
    private createMessageHash;
    private getRecentMessages;
    private getAIResponse;
    private startChainLoop;
    private stopChainLoop;
    private processMessage;
    stop(): Promise<void>;
}
export declare function start(runtime: IAgentRuntime): Promise<CustomTelegramClient>;
