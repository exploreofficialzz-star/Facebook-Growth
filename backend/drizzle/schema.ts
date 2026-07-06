import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  facebookPageUrl: varchar("facebookPageUrl", { length: 500 }).notNull(),
  facebookPageId: varchar("facebookPageId", { length: 100 }),
  targetFollowers: int("targetFollowers").notNull().default(0),
  targetLikes: int("targetLikes").notNull().default(0),
  targetComments: int("targetComments").notNull().default(0),
  targetShares: int("targetShares").notNull().default(0),
  currentFollowers: int("currentFollowers").notNull().default(0),
  currentLikes: int("currentLikes").notNull().default(0),
  currentComments: int("currentComments").notNull().default(0),
  currentShares: int("currentShares").notNull().default(0),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "failed"]).default("draft").notNull(),
  progress: int("progress").notNull().default(0),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const botAccounts = mysqlTable("botAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  facebookEmail: varchar("facebookEmail", { length: 255 }).notNull(),
  facebookUsername: varchar("facebookUsername", { length: 255 }).notNull(),
  facebookPasswordEncrypted: text("facebookPasswordEncrypted").notNull(),
  status: mysqlEnum("status", ["warming", "active", "paused", "banned", "inactive"]).default("warming").notNull(),
  warmupPhase: int("warmupPhase").notNull().default(1),
  daysActive: int("daysActive").notNull().default(0),
  lastActivityAt: timestamp("lastActivityAt"),
  proxyId: int("proxyId"),
  todayLikes: int("todayLikes").notNull().default(0),
  todayComments: int("todayComments").notNull().default(0),
  todayShares: int("todayShares").notNull().default(0),
  todayFollows: int("todayFollows").notNull().default(0),
  totalLikes: int("totalLikes").notNull().default(0),
  totalComments: int("totalComments").notNull().default(0),
  totalShares: int("totalShares").notNull().default(0),
  totalFollows: int("totalFollows").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotAccount = typeof botAccounts.$inferSelect;
export type InsertBotAccount = typeof botAccounts.$inferInsert;

export const proxies = mysqlTable("proxies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["mobile", "residential", "datacenter"]).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  port: int("port").notNull(),
  username: varchar("username", { length: 255 }),
  passwordEncrypted: text("passwordEncrypted"),
  status: mysqlEnum("proxyStatus", ["active", "inactive", "unhealthy"]).default("active").notNull(),
  successRate: int("successRate").notNull().default(100),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = typeof proxies.$inferInsert;

export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  botAccountId: int("botAccountId").notNull(),
  actionType: mysqlEnum("actionType", ["like", "comment", "share", "follow", "browse", "login", "logout"]).notNull(),
  targetPostUrl: varchar("targetPostUrl", { length: 500 }),
  targetPageUrl: varchar("targetPageUrl", { length: 500 }),
  status: mysqlEnum("logStatus", ["success", "failed", "pending"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;