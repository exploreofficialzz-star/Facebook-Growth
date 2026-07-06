import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createCampaign, getUserCampaigns, getCampaignById } from '../db';

const createCampaignSchema = z.object({
  facebookPageUrl: z.string().url('Invalid Facebook page URL'),
  targetFollowers: z.number().int().positive('Must be greater than 0'),
  targetLikes: z.number().int().nonnegative('Must be 0 or greater'),
  targetComments: z.number().int().nonnegative('Must be 0 or greater'),
  targetShares: z.number().int().nonnegative('Must be 0 or greater'),
});

export const campaignsRouter = router({
  create: protectedProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      return await createCampaign(ctx.user.id, input);
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await getUserCampaigns(ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const campaign = await getCampaignById(input.id, ctx.user.id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    }),
});
