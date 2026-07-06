import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, campaigns, botAccounts, proxies, activityLogs, Campaign, BotAccount, Proxy, ActivityLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Campaign queries
export async function getUserCampaigns(userId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(campaignId: number, userId: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaigns).where(
    and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
  ).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createCampaign(
  userId: number,
  data: {
    facebookPageUrl: string;
    targetFollowers: number;
    targetLikes: number;
    targetComments: number;
    targetShares: number;
  }
): Promise<Campaign> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values({
    userId,
    facebookPageUrl: data.facebookPageUrl,
    targetFollowers: data.targetFollowers,
    targetLikes: data.targetLikes,
    targetComments: data.targetComments,
    targetShares: data.targetShares,
    currentFollowers: 0,
    currentLikes: 0,
    currentComments: 0,
    currentShares: 0,
    status: "draft",
    progress: 0,
  });

  const campaignId = result[0].insertId;
  const campaign = await getCampaignById(Number(campaignId), userId);
  if (!campaign) throw new Error("Failed to create campaign");
  return campaign;
}

// Bot Account queries
export async function getUserBotAccounts(userId: number): Promise<BotAccount[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(botAccounts).where(eq(botAccounts.userId, userId)).orderBy(desc(botAccounts.createdAt));
}

export async function getBotAccountById(accountId: number, userId: number): Promise<BotAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(botAccounts).where(
    and(eq(botAccounts.id, accountId), eq(botAccounts.userId, userId))
  ).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createBotAccount(
  userId: number,
  data: {
    facebookEmail: string;
    facebookUsername: string;
    facebookPasswordEncrypted: string;
    proxyId?: number;
  }
): Promise<BotAccount> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(botAccounts).values({
    userId,
    facebookEmail: data.facebookEmail,
    facebookUsername: data.facebookUsername,
    facebookPasswordEncrypted: data.facebookPasswordEncrypted,
    proxyId: data.proxyId,
    status: "warming",
    warmupPhase: 1,
    daysActive: 0,
  });

  const accountId = result[0].insertId;
  const account = await getBotAccountById(Number(accountId), userId);
  if (!account) throw new Error("Failed to create bot account");
  return account;
}

// Proxy queries
export async function getUserProxies(userId: number): Promise<Proxy[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(proxies).where(eq(proxies.userId, userId)).orderBy(desc(proxies.createdAt));
}

export async function getProxyById(proxyId: number, userId: number): Promise<Proxy | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(proxies).where(
    and(eq(proxies.id, proxyId), eq(proxies.userId, userId))
  ).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createProxy(
  userId: number,
  data: {
    type: "mobile" | "residential" | "datacenter";
    address: string;
    port: number;
    username?: string;
    passwordEncrypted?: string;
  }
): Promise<Proxy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(proxies).values({
    userId,
    type: data.type,
    address: data.address,
    port: data.port,
    username: data.username,
    passwordEncrypted: data.passwordEncrypted,
    status: "active",
    successRate: 100,
  });

  const proxyId = result[0].insertId;
  const proxy = await getProxyById(Number(proxyId), userId);
  if (!proxy) throw new Error("Failed to create proxy");
  return proxy;
}

// Activity Log queries
export async function getCampaignActivityLogs(campaignId: number, limit: number = 50): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(activityLogs)
    .where(eq(activityLogs.campaignId, campaignId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
}

export async function createActivityLog(
  campaignId: number,
  botAccountId: number,
  data: {
    actionType: "like" | "comment" | "share" | "follow" | "browse" | "login" | "logout";
    targetPostUrl?: string;
    targetPageUrl?: string;
    status: "success" | "failed" | "pending";
    errorMessage?: string;
  }
): Promise<ActivityLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activityLogs).values({
    campaignId,
    botAccountId,
    actionType: data.actionType,
    targetPostUrl: data.targetPostUrl,
    targetPageUrl: data.targetPageUrl,
    status: data.status,
    errorMessage: data.errorMessage,
  });

  const logId = result[0].insertId;
  const log = await db.select().from(activityLogs).where(eq(activityLogs.id, Number(logId))).limit(1);
  if (!log || log.length === 0) throw new Error("Failed to create activity log");
  return log[0];
}

// Dashboard statistics
export async function getUserDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const userCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId));
  const userBotAccounts = await db.select().from(botAccounts).where(eq(botAccounts.userId, userId));
  const userProxies = await db.select().from(proxies).where(eq(proxies.userId, userId));

  const activeCampaigns = userCampaigns.filter(c => c.status === "active").length;
  const activeBotAccounts = userBotAccounts.filter(b => b.status === "active" || b.status === "warming").length;
  const healthyProxies = userProxies.filter(p => p.status === "active").length;

  const totalEngagements = userBotAccounts.reduce((sum, b) => sum + b.totalLikes + b.totalComments + b.totalShares + b.totalFollows, 0);
  const todayEngagements = userBotAccounts.reduce((sum, b) => sum + b.todayLikes + b.todayComments + b.todayShares + b.todayFollows, 0);

  return {
    totalCampaigns: userCampaigns.length,
    activeCampaigns,
    totalBotAccounts: userBotAccounts.length,
    activeBotAccounts,
    totalProxies: userProxies.length,
    healthyProxies,
    totalEngagements,
    todayEngagements,
  };
}
