import { Request } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import * as db from "../db";
import { Profile } from "../../drizzle/schema";

export type AuthenticatedUser = Profile & {
  taskUid?: string;
  isCron?: boolean;
};

class ManusSdk {
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ForbiddenError("Authorization header missing or malformed");
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await db.supabase.auth.getUser(token);

    if (error || !user) {
      throw ForbiddenError("Invalid or expired Supabase token");
    }

    let profile = await db.getProfileById(user.id);

    if (!profile) {
      await db.upsertUser({
        id: user.id,
        email: user.email ?? null,
        name: user.user_metadata.full_name ?? user.email ?? null,
        loginMethod: user.app_metadata.provider ?? null,
        lastSignedIn: new Date(),
      });
      profile = await db.getProfileById(user.id);
    }

    if (!profile) {
      throw ForbiddenError("User profile not found");
    }

    return profile as AuthenticatedUser;
  }
}

export const sdk = new ManusSdk();
