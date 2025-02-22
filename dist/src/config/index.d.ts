import { Character, ModelProviderName } from '@elizaos/core';
export declare function parseArguments(): {
    character?: string;
    characters?: string;
};
export declare function loadCharacters(charactersArg: string): Promise<Character[]>;
export declare function getTokenForProvider(provider: ModelProviderName, character: Character): string;
