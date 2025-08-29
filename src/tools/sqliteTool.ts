import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function querySQLite(dbPath: string, sql: string) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    return await db.all(sql);
  } finally {
    await db.close();
  }
}
