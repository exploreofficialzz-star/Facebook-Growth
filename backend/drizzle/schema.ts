import { integer, pgTable, text, timestamp, varchar, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoles = pgEnum("user_role", ["user", "admin"]);
export const campaignStatus = pgEnum("campaign_status", ["draft", "active", "paused", "completed", "failed"]);
export const botAccountStatus = pgEnum("bot_account_status", ["warming", "active", "paused", "banned", "inactive"]);
export const proxyType = pgEnum("proxy_type", ["mobile", "residential", "datacenter"]);
export const proxyStatus = pgEnum("proxy_status", ["active", "inactive", "unhealthy"]);
export const activityActionType = pgEnum("activity_action_type", ["like", "comment", "share", "follow", "browse", "login", "logout"]);
export const activityLogStatus = pgEnum("activity_log_status", ["success", "failed", "pending"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  loginMethod: text("login_method"),
  role: userRoles("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  facebookPageUrl: varchar("facebook_page_url", { length: 500 }).notNull(),
  facebookPageId: varchar("facebook_page_id", { length: 100 }),
  targetFollowers: integer("target_followers").notNull().default(0),
  targetLikes: integer("target_likes").notNull().default(0),
  targetComments: integer("target_comments").notNull().default(0),
  targetShares: integer("target_shares").notNull().default(0),
  currentFollowers: integer("current_followers").notNull().default(0),
  currentLikes: integer("current_likes").notNull().default(0),
  currentComments: integer("current_comments").notNull().default(0),
  currentShares: integer("current_shares").notNull().default(0),
  status: campaignStatus("status").default("draft").notNull(),
  progress: integer("progress").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(profiles, { fields: [campaigns.userId], references: [profiles.id] }),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const botAccounts = pgTable("bot_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  facebookEmail: varchar("facebook_email", { length: 255 }).notNull(),
  facebookUsername: varchar("facebook_username", { length: 255 }).notNull(),
  facebookPasswordEncrypted: text("facebook_password_encrypted").notNull(),
  status: botAccountStatus("status").default("warming").notNull(),
  warmupPhase: integer("warmup_phase").notNull().default(1),
  daysActive: integer("days_active").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at"),
  proxyId: integer("proxy_id"),
  todayLikes: integer("today_likes").notNull().default(0),
  todayComments: integer("today_comments").notNull().default(0),
  todayShares: integer("today_shares").notNull().default(0),
  todayFollows: integer("today_follows").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalShares: integer("total_shares").notNull().default(0),
  totalFollows: integer("total_follows").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botAccountsRelations = relations(botAccounts, ({ one }) => ({
  user: one(profiles, { fields: [botAccounts.userId], references: [profiles.id] }),
}));

export type BotAccount = typeof botAccounts.$inferSelect;
export type InsertBotAccount = typeof botAccounts.$inferInsert;

export const proxies = pgTable("proxies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: proxyType("type").notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  username: varchar("username", { length: 255 }),
  passwordEncrypted: text("password_encrypted"),
  status: proxyStatus("status").default("active").notNull(),
  successRate: integer("success_rate").notNull().default(100),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const proxiesRelations = relations(proxies, ({ one }) => ({
  user: one(profiles, { fields: [proxies.userId], references: [profiles.id] }),
}));

export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = typeof proxies.$inferInsert;

export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  botAccountId: integer("bot_account_id").notNull().references(() => botAccounts.id, { onDelete: "cascade" }),
  actionType: activityActionType("action_type").notNull(),
  targetPostUrl: varchar("target_post_url", { length: 500 }),
  targetPageUrl: varchar("target_page_url", { length: 500 }),
  status: activityLogStatus("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  campaign: one(campaigns, { fields: [activityLogs.campaignId], references: [campaigns.id] }),
  botAccount: one(botAccounts, { fields: [activityLogs.botAccountId], references: [botAccounts.id] }),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
