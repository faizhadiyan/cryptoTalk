import { Character, AgentRuntime } from '@elizaos/core';

declare const wait: (minTime?: number, maxTime?: number) => Promise<unknown>;
declare function createAgent(character: Character, db: any, cache: any, token: string): AgentRuntime;

export { createAgent, wait };
