import { db as drizzleDb, pool } from "./db";
import type { IStorage } from "./storage/types";
import { DrizzleStorage } from "./storage/drizzle";

// Strict DB-only storage: construct DrizzleStorage and verify connectivity.
if (!drizzleDb || !pool) {
  throw new Error("Database not initialized. Ensure DATABASE_URL is set and reachable.");
}

export const storage: IStorage = new DrizzleStorage(drizzleDb);
