import { PostgresDatabaseAdapter } from '@elizaos/adapter-postgres';
import { SqliteDatabaseAdapter } from '@elizaos/adapter-sqlite';
export declare function initializeDatabase(dataDir: string): PostgresDatabaseAdapter | SqliteDatabaseAdapter;
