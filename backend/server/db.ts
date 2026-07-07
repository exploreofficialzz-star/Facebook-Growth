import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertProfile, profiles, campaigns, botAccounts, proxies, activityLogs, Campaign, BotAccount, Proxy, ActivityLog, InsertCampaign, InsertBotAccount, InsertProxy, InsertActivityLog } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertProfile): Promise<void> {
  if (!user.id) throw new Error("User ID is required for upsert");
  const db = await getDb();
  if (!db) return;
  await db.insert(profiles).values(user).onConflictDoUpdate({
    target: profiles.id,
    set: {
      name: user.name,
      email: user.email,
      lastSignedIn: user.lastSignedIn,
      updatedAt: new Date(),
    },
  });
}

export async function getProfileById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserCampaigns(userId: string): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(campaignId: number, userId: string): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).where(eq(campaigns.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCampaign(campaign: InsertCampaign): Promise<Campaign> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaigns).values(campaign).returning();
  return result[0];
}

export async function updateCampaign(campaignId: number, userId: string, updates: Partial<InsertCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set({ ...updates, updatedAt: new Date() }).where(eq(campaigns.id, campaignId)).where(eq(campaigns.userId, userId));
}

export async function deleteCampaign(campaignId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaigns).where(eq(campaigns.id, campaignId)).where(eq(campaigns.userId, userId));
}

export async function getUserBotAccounts(userId: string): Promise<BotAccount[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(botAccounts).where(eq(botAccounts.userId, userId)).orderBy(desc(botAccounts.createdAt));
}

export async function getBotAccountById(botAccountId: number, userId: string): Promise<BotAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(botAccounts).where(eq(botAccounts.id, botAccountId)).where(eq(botAccounts.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBotAccount(botAccount: InsertBotAccount): Promise<BotAccount> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(botAccounts).values(botAccount).returning();
  return result[0];
}

export async function updateBotAccount(botAccountId: number, userId: string, updates: Partial<InsertBotAccount>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(botAccounts).set({ ...updates, updatedAt: new Date() }).where(eq(botAccounts.id, botAccountId)).where(eq(botAccounts.userId, userId));
}

export async function deleteBotAccount(botAccountId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(botAccounts).where(eq(botAccounts.id, botAccountId)).where(eq(botAccounts.userId, userId));
}

export async function getUserProxies(userId: string): Promise<Proxy[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(proxies).where(eq(proxies.userId, userId)).orderBy(desc(proxies.createdAt));
}

export async function getProxyById(proxyId: number, userId: string): Promise<Proxy | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(proxies).where(eq(proxies.id, proxyId)).where(eq(proxies.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProxy(proxy: InsertProxy): Promise<Proxy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(proxies).values(proxy).returning();
  return result[0];
}

export async function updateProxy(proxyId: number, userId: string, updates: Partial<InsertProxy>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(proxies).set({ ...updates, updatedAt: new Date() }).where(eq(proxies.id, proxyId)).where(eq(proxies.userId, userId));
}

export async function deleteProxy(proxyId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(proxies).where(eq(proxies.id, proxyId)).where(eq(proxies.userId, userId));
}

export async function createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(activityLogs).values(activityLog).returning();
  return result[0];
}

export async function getCampaignActivityLogs(campaignId: number): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLogs).where(eq(activityLogs.campaignId, campaignId)).orderBy(desc(activityLogs.timestamp));
}

export async function getUserDashboardStats(userId: string) {
  const db = await getDb();
  if (!db) return { activeCampaigns: 0, totalFollowersGained: 0, activeBots: 0, totalActionsToday: 0 };

  const [campaignStats] = await db.select({
    count: sql<number>`count(*)`
  }).from(campaigns).where(eq(campaigns.userId, userId)).where(eq(campaigns.status, 'active'));

  const [botStats] = await db.select({
    count: sql<number>`count(*)`
  }).from(botAccounts).where(eq(botAccounts.userId, userId)).where(eq(botAccounts.status, 'active'));

  return {
    activeCampaigns: Number(campaignStats?.count || 0),
    totalFollowersGained: 0, // Placeholder
    activeBots: Number(botStats?.count || 0),
    totalActionsToday: 0 // Placeholder
  };
}
