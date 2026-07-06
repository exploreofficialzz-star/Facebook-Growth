import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createProxy, getUserProxies, getProxyById } from '../db';
import crypto from 'crypto';

const createProxySchema = z.object({
  type: z.enum(['mobile', 'residential', 'datacenter']),
  address: z.string().ip('Invalid IP address'),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Simple encryption for passwords
function encryptPassword(password: string): string {
  if (!password) return '';
  const cipher = crypto.createCipher('aes-256-cbc', process.env.JWT_SECRET || 'default-secret');
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export const proxiesRouter = router({
  create: protectedProcedure
    .input(createProxySchema)
    .mutation(async ({ ctx, input }) => {
      const encryptedPassword = input.password ? encryptPassword(input.password) : undefined;
      return await createProxy(ctx.user.id, {
        type: input.type,
        address: input.address,
        port: input.port,
        username: input.username,
        passwordEncrypted: encryptedPassword,
      });
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await getUserProxies(ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const proxy = await getProxyById(input.id, ctx.user.id);
      if (!proxy) {
        throw new Error('Proxy not found');
      }
      return proxy;
    }),
});
