import { AgentRuntime, type Character } from '@elizaos/core';
export declare const wait: (minTime?: number, maxTime?: number) => Promise<unknown>;
export declare function createAgent(character: Character, db: any, cache: any, token: string): AgentRuntime;
