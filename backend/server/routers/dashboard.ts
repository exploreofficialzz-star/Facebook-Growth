import { protectedProcedure, router } from '../_core/trpc';
import { getUserDashboardStats, getCampaignActivityLogs } from '../db';
import { z } from 'zod';

export const dashboardRouter = router({
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const stats = await getUserDashboardStats(ctx.user.id);
      return stats || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalBotAccounts: 0,
        activeBotAccounts: 0,
        totalProxies: 0,
        healthyProxies: 0,
        totalEngagements: 0,
        todayEngagements: 0,
      };
    }),

  getActivityLogs: protectedProcedure
    .input(z.object({ campaignId: z.number().int(), limit: z.number().int().default(50) }))
    .query(async ({ input }) => {
      return await getCampaignActivityLogs(input.campaignId, input.limit);
    }),
});
