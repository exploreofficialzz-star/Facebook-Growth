import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createBotAccount, getUserBotAccounts, getBotAccountById } from '../db';
import crypto from 'crypto';

const createBotAccountSchema = z.object({
  facebookEmail: z.string().email('Invalid email address'),
  facebookPassword: z.string().min(6, 'Password must be at least 6 characters'),
  facebookUsername: z.string().min(3, 'Username must be at least 3 characters'),
  proxyId: z.number().int().optional(),
});

// Simple encryption for passwords (in production, use a proper encryption library)
function encryptPassword(password: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.JWT_SECRET || 'default-secret');
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export const botAccountsRouter = router({
  create: protectedProcedure
    .input(createBotAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const encryptedPassword = encryptPassword(input.facebookPassword);
      return await createBotAccount(ctx.user.id, {
        facebookEmail: input.facebookEmail,
        facebookUsername: input.facebookUsername,
        facebookPasswordEncrypted: encryptedPassword,
        proxyId: input.proxyId,
      });
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await getUserBotAccounts(ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const account = await getBotAccountById(input.id, ctx.user.id);
      if (!account) {
        throw new Error('Bot account not found');
      }
      return account;
    }),
});
