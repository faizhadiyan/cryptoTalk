import { CacheManager, Character, DbCacheAdapter, IDatabaseCacheAdapter } from "@elizaos/core";
export declare function initializeDbCache(character: Character, db: IDatabaseCacheAdapter): CacheManager<DbCacheAdapter>;
