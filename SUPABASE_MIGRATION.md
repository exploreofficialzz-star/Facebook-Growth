# Supabase Auth Migration for Facebook-Growth

This document outlines the steps to migrate the authentication system from the current Manus OAuth setup to Supabase Auth. The migration will involve changes to the database schema, backend API, and frontend application.

## Step 1: Supabase Project Setup and Initial Schema

First, you'll need to create a Supabase project and obtain your project URL and `anon` key. Then, we'll create a `profiles` table to store additional user information, linked to Supabase's built-in `auth.users` table.

**SQL Query to create `profiles` table:**

```sql
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text UNIQUE,
  login_method text,
  role text DEFAULT 'user' NOT NULL,
  last_signed_in timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

**Explanation:**
*   The `profiles` table uses the `id` (UUID) from `auth.users` as its primary key and foreign key, ensuring a one-to-one relationship.
*   `name`, `email`, `login_method`, `role`, `last_signed_in`, `created_at`, and `updated_at` columns mirror the existing `users` table.
*   Row Level Security (RLS) policies are set up to allow users to manage their own profiles.

## Step 2: Update Drizzle Schema for UUIDs

We need to modify `backend/drizzle/schema.ts` to reflect the new `profiles` table and change `userId` references in other tables to use UUIDs instead of integers. This will be done in pieces.

**File: `backend/drizzle/schema.ts` (Part 1/X)**

First, remove the existing `users` table definition and add the `profiles` table. Also, import `pgTable`, `uuid`, and `pgEnum` from `drizzle-orm/pg-core` as we'll be using PostgreSQL with Supabase. We'll also need to change `mysqlEnum` to `pgEnum` and `mysqlTable` to `pgTable`.

```typescript
import { pgTable, text, timestamp, varchar, uuid, pgEnum } from "drizzle-orm/pg-core";

export const userRoles = pgEnum("user_role", ["user", "admin"]);
export const campaignStatus = pgEnum("campaign_status", ["draft", "active", "paused", "completed", "failed"]);
export const botAccountStatus = pgEnum("bot_account_status", ["warming", "active", "paused", "banned", "inactive"]);
export const proxyType = pgEnum("proxy_type", ["mobile", "residential", "datacenter"]);
export const proxyStatus = pgEnum("proxy_status", ["active", "inactive", "unhealthy"]);
export const activityActionType = pgEnum("activity_action_type", ["like", "comment", "share", "follow", "browse", "login", "logout"]);
export const activityLogStatus = pgEnum("activity_log_status", ["success", "failed", "pending"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => auth.users.id, { onDelete: "cascade" }),
  name: text("name"),
  email: text("email").unique(),
  loginMethod: text("login_method"),
  role: userRoles("role").default('user').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// Placeholder for auth.users table, which is managed by Supabase
// We define it here for Drizzle relations
export const auth = {
  users: pgTable("users", {
    id: uuid("id").primaryKey(),
  })
};

// Remaining tables will be updated in subsequent steps
```

**Note:** The `auth.users` table is a placeholder for Drizzle to understand the foreign key relationship. It's managed by Supabase directly.

## Step 3: Update `campaigns` table in Drizzle Schema

Now, let's update the `campaigns` table in `backend/drizzle/schema.ts` to reference the `profiles` table using a UUID for `userId`.

**File: `backend/drizzle/schema.ts` (Part 2/X)**

```typescript
import { int, pgTable, text, timestamp, varchar, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ... (previous pgEnum definitions and profiles table)

export const campaigns = pgTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  facebookPageUrl: varchar("facebook_page_url", { length: 500 }).notNull(),
  facebookPageId: varchar("facebook_page_id", { length: 100 }),
  targetFollowers: int("target_followers").notNull().default(0),
  targetLikes: int("target_likes").notNull().default(0),
  targetComments: int("target_comments").notNull().default(0),
  targetShares: int("target_shares").notNull().default(0),
  currentFollowers: int("current_followers").notNull().default(0),
  currentLikes: int("current_likes").notNull().default(0),
  currentComments: int("current_comments").notNull().default(0),
  currentShares: int("current_shares").notNull().default(0),
  status: campaignStatus("status").default("draft").notNull(),
  progress: int("progress").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(profiles, { fields: [campaigns.userId], references: [profiles.id] }),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Remaining tables will be updated in subsequent steps
```

**Explanation of changes:**
*   `userId` column type changed from `int` to `uuid`.
*   `userId` now references `profiles.id` with a cascade delete.
*   Added `campaignsRelations` to define the relationship between `campaigns` and `profiles` for Drizzle.
*   Column names are updated to `snake_case` for consistency with PostgreSQL conventions.

## Step 4: Update `botAccounts` table in Drizzle Schema

Next, we update the `botAccounts` table in `backend/drizzle/schema.ts` to use UUIDs for `userId` and define its relationship with the `profiles` table.

**File: `backend/drizzle/schema.ts` (Part 3/X)**

```typescript
// ... (previous pgEnum definitions, profiles table, and campaigns table)

export const botAccounts = pgTable("bot_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  facebookEmail: varchar("facebook_email", { length: 255 }).notNull(),
  facebookUsername: varchar("facebook_username", { length: 255 }).notNull(),
  facebookPasswordEncrypted: text("facebook_password_encrypted").notNull(),
  status: botAccountStatus("status").default("warming").notNull(),
  warmupPhase: int("warmup_phase").notNull().default(1),
  daysActive: int("days_active").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at"),
  proxyId: int("proxy_id"), // This will be updated to UUID later if proxies are user-specific
  todayLikes: int("today_likes").notNull().default(0),
  todayComments: int("today_comments").notNull().default(0),
  todayShares: int("today_shares").notNull().default(0),
  todayFollows: int("today_follows").notNull().default(0),
  totalLikes: int("total_likes").notNull().default(0),
  totalComments: int("total_comments").notNull().default(0),
  totalShares: int("total_shares").notNull().default(0),
  totalFollows: int("total_follows").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const botAccountsRelations = relations(botAccounts, ({ one }) => ({
  user: one(profiles, { fields: [botAccounts.userId], references: [profiles.id] }),
}));

export type BotAccount = typeof botAccounts.$inferSelect;
export type InsertBotAccount = typeof botAccounts.$inferInsert;

// Remaining tables will be updated in subsequent steps
```

**Explanation of changes:**
*   `userId` column type changed from `int` to `uuid`.
*   `userId` now references `profiles.id` with a cascade delete.
*   Added `botAccountsRelations` for Drizzle.
*   Column names are updated to `snake_case`.

## Step 5: Update `proxies` table in Drizzle Schema

Next, we update the `proxies` table in `backend/drizzle/schema.ts` to use UUIDs for `userId` and define its relationship with the `profiles` table.

**File: `backend/drizzle/schema.ts` (Part 4/X)**

```typescript
// ... (previous pgEnum definitions, profiles table, campaigns table, and botAccounts table)

export const proxies = pgTable("proxies", {
  id: int("id").autoincrement().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: proxyType("type").notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  port: int("port").notNull(),
  username: varchar("username", { length: 255 }),
  passwordEncrypted: text("password_encrypted"),
  status: proxyStatus("status").default("active").notNull(),
  successRate: int("success_rate").notNull().default(100),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const proxiesRelations = relations(proxies, ({ one }) => ({
  user: one(profiles, { fields: [proxies.userId], references: [profiles.id] }),
}));

export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = typeof proxies.$inferInsert;

// Remaining tables will be updated in subsequent steps
```

**Explanation of changes:**
*   `userId` column type changed from `int` to `uuid`.
*   `userId` now references `profiles.id` with a cascade delete.
*   Added `proxiesRelations` for Drizzle.
*   Column names are updated to `snake_case`.

## Step 6: Update `activityLogs` table in Drizzle Schema

Finally, we update the `activityLogs` table in `backend/drizzle/schema.ts` to define its relationships with the `campaigns` and `botAccounts` tables.

**File: `backend/drizzle/schema.ts` (Part 5/X)**

```typescript
// ... (previous pgEnum definitions, profiles table, campaigns table, botAccounts table, and proxies table)

export const activityLogs = pgTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  botAccountId: int("bot_account_id").notNull().references(() => botAccounts.id, { onDelete: "cascade" }),
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
```

**Explanation of changes:**
*   `campaignId` and `botAccountId` now explicitly reference `campaigns.id` and `botAccounts.id` respectively with cascade delete.
*   Added `activityLogsRelations` for Drizzle.
*   Column names are updated to `snake_case`.

## Step 7: Update `backend/server/db.ts` for Supabase Auth

We need to modify `backend/server/db.ts` to use Supabase client for user management instead of `openId` based lookups. This will involve replacing `upsertUser` and `getUserByOpenId` functions.

**File: `backend/server/db.ts` (Part 1/X)**

First, we'll add the Supabase client initialization and modify `upsertUser` to interact with the `profiles` table.

```typescript
import { drizzle } from "drizzle-orm/mysql2"; // This will change to pg-core later
import { InsertProfile, profiles, campaigns, botAccounts, proxies, activityLogs, Campaign, BotAccount, Proxy, ActivityLog } from "../drizzle/schema";
import { ENV } from './_core/env';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function upsertUser(user: InsertProfile): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        login_method: user.loginMethod ?? null,
        role: user.role ?? 'user',
        last_signed_in: user.lastSignedIn ?? new Date(),
        created_at: user.createdAt ?? new Date(),
        updated_at: user.updatedAt ?? new Date(),
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getProfileById(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ... (remaining campaign, botAccount, proxy, activityLog queries)
```

**Explanation of changes:**
*   Import `createClient` from `@supabase/supabase-js`.
*   Initialize `supabase` client using `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables.
*   `upsertUser` now uses the Supabase client to `upsert` into the `profiles` table.
*   `getUserByOpenId` is replaced with `getProfileById` which queries the `profiles` table by `id` (UUID).

**File: `backend/server/db.ts` (Part 2/X)**

Now, let's update the remaining functions in `backend/server/db.ts` to use the `uuid` for `userId` and ensure they interact correctly with the `profiles` table.

```typescript
import { drizzle } from "drizzle-orm/pg-core"; // Changed from mysql2
import { InsertProfile, profiles, campaigns, botAccounts, proxies, activityLogs, Campaign, BotAccount, Proxy, ActivityLog } from "../drizzle/schema";
import { ENV } from './_core/env';
import { createClient } from '@supabase/supabase-js';
import { eq, desc } from "drizzle-orm"; // Import eq and desc for queries

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function upsertUser(user: InsertProfile): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  // No need to get drizzle db here, directly use Supabase client for profiles table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        login_method: user.loginMethod ?? null,
        role: user.role ?? 'user',
        last_signed_in: user.lastSignedIn ?? new Date(),
        created_at: user.createdAt ?? new Date(),
        updated_at: user.updatedAt ?? new Date(),
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getProfileById(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Campaign queries
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

export async function createCampaign(campaign: InsertCampaign): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(campaigns).values(campaign);
  // Assuming the insert returns the full campaign object or its ID
  // This might need adjustment based on Drizzle's actual return for inserts
  return result[0]; // Placeholder, adjust based on actual Drizzle return
}

export async function updateCampaign(campaignId: number, userId: string, updates: Partial<InsertCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(campaigns).set(updates).where(eq(campaigns.id, campaignId)).where(eq(campaigns.userId, userId));
}

export async function deleteCampaign(campaignId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(campaigns).where(eq(campaigns.id, campaignId)).where(eq(campaigns.userId, userId));
}

// Bot Account queries
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

export async function createBotAccount(botAccount: InsertBotAccount): Promise<BotAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(botAccounts).values(botAccount);
  return result[0]; // Placeholder
}

export async function updateBotAccount(botAccountId: number, userId: string, updates: Partial<InsertBotAccount>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(botAccounts).set(updates).where(eq(botAccounts.id, botAccountId)).where(eq(botAccounts.userId, userId));
}

export async function deleteBotAccount(botAccountId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(botAccounts).where(eq(botAccounts.id, botAccountId)).where(eq(botAccounts.userId, userId));
}

// Proxy queries
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

export async function createProxy(proxy: InsertProxy): Promise<Proxy | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(proxies).values(proxy);
  return result[0]; // Placeholder
}

export async function updateProxy(proxyId: number, userId: string, updates: Partial<InsertProxy>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(proxies).set(updates).where(eq(proxies.id, proxyId)).where(eq(proxies.userId, userId));
}

export async function deleteProxy(proxyId: number, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(proxies).where(eq(proxies.id, proxyId)).where(eq(proxies.userId, userId));
}

// Activity Log queries
export async function createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(activityLogs).values(activityLog);
  return result[0]; // Placeholder
}

export async function getCampaignActivityLogs(campaignId: number): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(activityLogs).where(eq(activityLogs.campaignId, campaignId)).orderBy(desc(activityLogs.timestamp));
}

export async function getBotAccountActivityLogs(botAccountId: number): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(activityLogs).where(eq(activityLogs.botAccountId, botAccountId)).orderBy(desc(activityLogs.timestamp));
}
```

**Explanation of changes:**
*   The `drizzle` import is changed from `drizzle-orm/mysql2` to `drizzle-orm/pg-core`.
*   `eq` and `desc` are imported from `drizzle-orm` for query building.
*   All functions that take `userId` as an argument now expect a `string` (UUID) instead of a `number`.
*   The `upsertUser` function no longer uses the Drizzle `db` instance for the `profiles` table, as it directly interacts with the Supabase client.
*   All queries referencing `campaigns.userId`, `botAccounts.userId`, and `proxies.userId` are updated to use the `uuid` type.

## Step 8: Update `backend/server/_core/sdk.ts` for Supabase Auth

This is a critical step where we replace the custom OAuth logic with Supabase Auth. We will remove the existing `exchangeCodeForToken`, `getUserInfo`, `createSessionToken`, `verifySession`, and `authenticateRequest` functions and replace them with Supabase Auth methods.

**File: `backend/server/_core/sdk.ts` (Part 1/X)**

```typescript
import { Request } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import * as db from "../../db";
import { createClient } from '@supabase/supabase-js';
import { Profile } from "../../drizzle/schema";

// Initialize Supabase client (same as in db.ts, can be refactored to a single instance)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthenticatedUser = Profile & {
  taskUid?: string;
  isCron?: boolean;
};

class ManusSdk {
  // Remove existing OAuth methods

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw ForbiddenError("Authorization header missing or malformed");
      }

      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw ForbiddenError("Invalid or expired token");
      }

      let profile = await db.getProfileById(user.id);

      if (!profile) {
        // If profile doesn't exist, create it from Supabase user data
        await db.upsertUser({
          id: user.id,
          email: user.email ?? null,
          name: user.user_metadata.full_name ?? user.email ?? null,
          loginMethod: user.app_metadata.provider ?? null,
          lastSignedIn: new Date(user.last_sign_in_at ?? new Date()),
          createdAt: new Date(user.created_at ?? new Date()),
          updatedAt: new Date(user.updated_at ?? new Date()),
        });
        profile = await db.getProfileById(user.id);
      }

      if (!profile) {
        throw ForbiddenError("User profile not found after upsert");
      }

      // TODO: Handle cron jobs if applicable with Supabase Auth
      // For now, assuming direct user authentication

      return profile as AuthenticatedUser;

    } catch (error) {
      console.error("[Auth] Supabase authentication failed:", error);
      throw ForbiddenError("Authentication failed");
    }
  }
}

export const sdk = new ManusSdk();

// Removed: exchangeCodeForToken, getUserInfo, createSessionToken, verifySession, parseCookies, getSessionCookieOptions, buildCronUser
```

**Explanation of changes:**
*   Removed all Manus OAuth related functions (`exchangeCodeForToken`, `getUserInfo`, `createSessionToken`, `verifySession`, etc.).
*   The `authenticateRequest` function is rewritten to use `supabase.auth.getUser(token)` to verify the user's session.
*   It now expects a Bearer token in the `Authorization` header, which is the standard for Supabase client-side authentication.
*   If a user profile doesn't exist in our `profiles` table, it will be created using data from `supabase.auth.getUser`.
*   The `AuthenticatedUser` type now extends `Profile` from our Drizzle schema.
*   Cron job handling is marked as `TODO` as it needs specific implementation for Supabase if required.

## Step 9: Update `backend/server/_core/oauth.ts`

This file becomes obsolete as we are replacing the Manus OAuth with Supabase Auth. We will remove its content.

**File: `backend/server/_core/oauth.ts`**

```typescript
// This file is no longer needed as Manus OAuth is replaced by Supabase Auth.
// The registerOAuthRoutes function should be removed from backend/server/_core/index.ts
```

**Explanation of changes:**
*   The file is emptied as its functionality is replaced.
*   A comment is added to remind to remove the `registerOAuthRoutes` call from `backend/server/_core/index.ts`.

## Step 10: Update `backend/server/_core/index.ts`

We need to remove the call to `registerOAuthRoutes` as it's no longer relevant.

**File: `backend/server/_core/index.ts` (Snippet)**

```typescript
// ... other imports
// import { registerOAuthRoutes } from "./oauth"; // Remove this line
// ...

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  // ... other app.use calls

  // registerOAuthRoutes(app); // Remove or comment out this line

  app.use("/api/trpc", trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }));

  // ... rest of the file
}
```

**Explanation of changes:**
*   The import and call to `registerOAuthRoutes(app)` are removed or commented out.

## Step 11: Update `frontend/src/_core/hooks/useAuth.ts`

This hook needs to be updated to interact with Supabase Auth client instead of the current tRPC `auth.me` query and `logout` mutation.

**File: `frontend/src/_core/hooks/useAuth.ts` (Part 1/X)**

```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { Profile } from "../../../../backend/drizzle/schema"; // Adjust path as needed

// Initialize Supabase client (same as in db.ts and sdk.ts, can be refactored)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch or create profile from our backend
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') { // Not Found
          // Create profile if it doesn't exist
          const { data: newProfile, error: newProfileError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email ?? null,
              name: session.user.user_metadata.full_name ?? session.user.email ?? null,
              login_method: session.user.app_metadata.provider ?? null,
              last_signed_in: new Date(session.user.last_sign_in_at ?? new Date()),
              created_at: new Date(session.user.created_at ?? new Date()),
              updated_at: new Date(session.user.updated_at ?? new Date()),
            })
            .select()
            .single();

          if (newProfileError) {
            console.error("Error creating profile:", newProfileError);
            setError(newProfileError);
            setUserProfile(null);
          } else {
            setUserProfile(newProfile as Profile);
          }
        } else if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError(profileError);
          setUserProfile(null);
        } else {
          setUserProfile(profile as Profile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') { // Not Found
          // Create profile if it doesn't exist
          const { data: newProfile, error: newProfileError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email ?? null,
              name: session.user.user_metadata.full_name ?? session.user.email ?? null,
              login_method: session.user.app_metadata.provider ?? null,
              last_signed_in: new Date(session.user.last_sign_in_at ?? new Date()),
              created_at: new Date(session.user.created_at ?? new Date()),
              updated_at: new Date(session.user.updated_at ?? new Date()),
            })
            .select()
            .single();

          if (newProfileError) {
            console.error("Error creating profile:", newProfileError);
            setError(newProfileError);
            setUserProfile(null);
          } else {
            setUserProfile(newProfile as Profile);
          }
        } else if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError(profileError);
          setUserProfile(null);
        } else {
          setUserProfile(profile as Profile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError(logoutError);
    } else {
      setUserProfile(null);
    }
    setLoading(false);
  }, []);

  const isAuthenticated = useMemo(() => !!userProfile, [userProfile]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, isAuthenticated]);

  return {
    user: userProfile,
    loading,
    error,
    isAuthenticated,
    logout,
    // refresh: () => {}, // Supabase auth listener handles this automatically
  };
}
```

**Explanation of changes:**
*   Removed tRPC related imports and queries.
*   Import `createClient` from `@supabase/supabase-js` and `Profile` from the Drizzle schema.
*   Initialize Supabase client using environment variables.
*   `onAuthStateChange` listener is set up to update the user's session and fetch/create their profile in our `profiles` table.
*   `logout` function now uses `supabase.auth.signOut()`.
*   The `isAuthenticated` and `loading` states are managed locally.
*   The redirect logic remains similar, but now based on the Supabase authentication state.

## Step 12: Update `frontend/src/main.tsx`

We need to remove the tRPC client setup related to authentication and potentially adjust the `getLoginUrl` if it's still used.

**File: `frontend/src/main.tsx` (Snippet)**

```typescript
// ... other imports
// import { trpc } from "./lib/trpc"; // Remove this line
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Keep if other queries are used
// import { httpBatchLink, loggerLink } from "@trpc/client"; // Remove this line
// import { getLoginUrl } from "./const"; // Remove if not used elsewhere

// ...

// Remove or comment out tRPC client setup related to auth
// const queryClient = new QueryClient();
// const trpcClient = trpc.createClient({
//   links: [
//     loggerLink({
//       enabled: (opts) =>
//         import.meta.env.DEV ||
//         (opts.direction === "down" && opts.result instanceof Error),
//     }),
//     httpBatchLink({
//       url: getBaseUrl() + "/api/trpc",
//       // You can pass any HTTP headers you wish here
//       async headers() {
//         const token = sessionStorage.getItem("manus-cookie");
//         return {
//           authorization: token ? `Bearer ${token}` : "",
//         };
//       },
//     }),
//   ],
// });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Remove QueryClientProvider and trpc.Provider if no other tRPC queries are used */}
    {/* <trpc.Provider client={trpcClient} queryClient={queryClient}> */}
      {/* <QueryClientProvider client={queryClient}> */}
        <App />
      {/* </QueryClientProvider> */}
    {/* </trpc.Provider> */}
  </React.StrictMode>
);
```

**Explanation of changes:**
*   Removed imports and setup for tRPC client that were specifically handling authentication tokens.
*   The `QueryClientProvider` and `trpc.Provider` might be removed if tRPC is no longer used for any other data fetching. If other tRPC queries remain, only the auth-related parts of the `httpBatchLink` should be removed.

## Step 13: Environment Variables

You will need to add the following environment variables to your `.env` file for both your backend and frontend:

```
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

For the frontend, these should be prefixed with `VITE_`:

```
VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

## Step 14: Install Supabase Client Libraries

You will need to install the Supabase client libraries in both your backend and frontend projects.

**Backend:**

```bash
pnpm add @supabase/supabase-js
```

**Frontend:**

```bash
pnpm add @supabase/supabase-js
```

## Step 15: Drizzle Migrations

After making all the schema changes, you will need to generate and run new Drizzle migrations to apply these changes to your database. This will involve changing the Drizzle configuration to use PostgreSQL instead of MySQL.

**Update `drizzle.config.ts` (or similar Drizzle config file):**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./backend/drizzle/schema.ts",
  out: "./backend/drizzle/migrations",
  driver: "pg", // Change from "mysql2" to "pg"
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Generate new migration:**

```bash
pnpm drizzle-kit generate:pg
```

**Apply migration:**

```bash
pnpm drizzle-kit push:pg
```

**Note:** You might need to manually adjust the generated migration file to handle data migration from your old `users` table to the new `profiles` table, especially for existing users. This typically involves writing a custom SQL script to transfer `openId`, `name`, `email`, `loginMethod`, `role`, `lastSignedIn`, `createdAt`, and `updatedAt` to the `profiles` table, mapping `openId` to `id` (UUID) in the `profiles` table. This is a complex step and depends on your existing data. You would need to map the `openId` from your existing users to the `id` (UUID) that Supabase assigns to users upon their first login or when they are created via `supabase.auth.admin.createUser`.

## Step 16: Supabase Authentication UI

You will need to integrate Supabase's authentication UI components or build your own. Supabase provides pre-built UI components that can be easily integrated.

**Example of integrating Supabase UI (in your login page component):**

```typescript
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient' // Your Supabase client instance

function LoginPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'facebook', 'github']}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  )
}

export default LoginPage;
```

**Explanation:**
*   This snippet shows how to use `@supabase/auth-ui-react` to render a login form with various providers.
*   You would replace your existing login page content with this component.

## Conclusion

This document provides a comprehensive guide to migrating your Facebook-Growth application to use Supabase Auth. Remember to carefully review each step, especially the Drizzle schema changes and data migration, to ensure a smooth transition. Testing thoroughly after each major change is highly recommended.

---

**References:**

[1] Supabase Documentation: [https://supabase.com/docs](https://supabase.com/docs)
[2] Drizzle ORM Documentation: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
