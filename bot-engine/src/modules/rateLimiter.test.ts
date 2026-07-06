import { describe, it, expect } from 'vitest';
import { EngagementRateLimiter, WarmupPhase, AccountMetrics } from './rateLimiter';

describe('EngagementRateLimiter', () => {
  describe('getWarmupPhase', () => {
    it('should return PHASE_1 for days 1-3', () => {
      expect(EngagementRateLimiter.getWarmupPhase(1)).toBe(WarmupPhase.PHASE_1);
      expect(EngagementRateLimiter.getWarmupPhase(2)).toBe(WarmupPhase.PHASE_1);
      expect(EngagementRateLimiter.getWarmupPhase(3)).toBe(WarmupPhase.PHASE_1);
    });

    it('should return PHASE_2 for days 4-7', () => {
      expect(EngagementRateLimiter.getWarmupPhase(4)).toBe(WarmupPhase.PHASE_2);
      expect(EngagementRateLimiter.getWarmupPhase(7)).toBe(WarmupPhase.PHASE_2);
    });

    it('should return PHASE_3 for days 8-14', () => {
      expect(EngagementRateLimiter.getWarmupPhase(8)).toBe(WarmupPhase.PHASE_3);
      expect(EngagementRateLimiter.getWarmupPhase(14)).toBe(WarmupPhase.PHASE_3);
    });

    it('should return PHASE_4 for day 15+', () => {
      expect(EngagementRateLimiter.getWarmupPhase(15)).toBe(WarmupPhase.PHASE_4);
      expect(EngagementRateLimiter.getWarmupPhase(100)).toBe(WarmupPhase.PHASE_4);
    });
  });

  describe('getDailyLimits', () => {
    it('should return zero limits for PHASE_1', () => {
      const limits = EngagementRateLimiter.getDailyLimits(WarmupPhase.PHASE_1);
      expect(limits.likes).toBe(0);
      expect(limits.comments).toBe(0);
      expect(limits.shares).toBe(0);
      expect(limits.follows).toBe(0);
    });

    it('should return conservative limits for PHASE_2', () => {
      const limits = EngagementRateLimiter.getDailyLimits(WarmupPhase.PHASE_2);
      expect(limits.likes).toBe(5);
      expect(limits.comments).toBe(2);
      expect(limits.shares).toBe(1);
      expect(limits.follows).toBe(3);
    });

    it('should return higher limits for PHASE_4', () => {
      const limits = EngagementRateLimiter.getDailyLimits(WarmupPhase.PHASE_4);
      expect(limits.likes).toBeGreaterThan(0);
      expect(limits.comments).toBeGreaterThan(0);
      expect(limits.shares).toBeGreaterThan(0);
      expect(limits.follows).toBeGreaterThan(0);
    });
  });

  describe('canPerformAction', () => {
    it('should prevent actions in PHASE_1', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 1,
        warmupPhase: WarmupPhase.PHASE_1,
        todayLikes: 0,
        todayComments: 0,
        todayShares: 0,
        todayFollows: 0,
      };

      expect(EngagementRateLimiter.canPerformAction('like', metrics)).toBe(false);
      expect(EngagementRateLimiter.canPerformAction('comment', metrics)).toBe(false);
    });

    it('should allow actions within limits', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 5,
        warmupPhase: WarmupPhase.PHASE_2,
        todayLikes: 2,
        todayComments: 1,
        todayShares: 0,
        todayFollows: 1,
      };

      expect(EngagementRateLimiter.canPerformAction('like', metrics)).toBe(true);
      expect(EngagementRateLimiter.canPerformAction('comment', metrics)).toBe(true);
    });

    it('should prevent actions when quota is exceeded', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 5,
        warmupPhase: WarmupPhase.PHASE_2,
        todayLikes: 5,
        todayComments: 2,
        todayShares: 1,
        todayFollows: 3,
      };

      expect(EngagementRateLimiter.canPerformAction('like', metrics)).toBe(false);
      expect(EngagementRateLimiter.canPerformAction('comment', metrics)).toBe(false);
    });
  });

  describe('getRemainingQuota', () => {
    it('should calculate remaining quota correctly', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 5,
        warmupPhase: WarmupPhase.PHASE_2,
        todayLikes: 2,
        todayComments: 1,
        todayShares: 0,
        todayFollows: 1,
      };

      expect(EngagementRateLimiter.getRemainingQuota('like', metrics)).toBe(3);
      expect(EngagementRateLimiter.getRemainingQuota('comment', metrics)).toBe(1);
      expect(EngagementRateLimiter.getRemainingQuota('share', metrics)).toBe(1);
      expect(EngagementRateLimiter.getRemainingQuota('follow', metrics)).toBe(2);
    });

    it('should return 0 when quota is exhausted', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 5,
        warmupPhase: WarmupPhase.PHASE_2,
        todayLikes: 5,
        todayComments: 2,
        todayShares: 1,
        todayFollows: 3,
      };

      expect(EngagementRateLimiter.getRemainingQuota('like', metrics)).toBe(0);
      expect(EngagementRateLimiter.getRemainingQuota('comment', metrics)).toBe(0);
    });
  });

  describe('getSafeActionDelay', () => {
    it('should return delays within expected ranges', () => {
      const phase1Delay = EngagementRateLimiter.getSafeActionDelay(WarmupPhase.PHASE_1);
      expect(phase1Delay).toBeGreaterThanOrEqual(30000);
      expect(phase1Delay).toBeLessThanOrEqual(60000);

      const phase4Delay = EngagementRateLimiter.getSafeActionDelay(WarmupPhase.PHASE_4);
      expect(phase4Delay).toBeGreaterThanOrEqual(10000);
      expect(phase4Delay).toBeLessThanOrEqual(30000);
    });
  });

  describe('isActionDistributionNatural', () => {
    it('should detect unnatural distribution in early phases', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 5,
        warmupPhase: WarmupPhase.PHASE_2,
        todayLikes: 5,
        todayComments: 0,
        todayShares: 0,
        todayFollows: 0,
      };

      expect(EngagementRateLimiter.isActionDistributionNatural(metrics)).toBe(false);
    });

    it('should allow varied distribution in later phases', () => {
      const metrics: AccountMetrics = {
        accountAgeInDays: 20,
        warmupPhase: WarmupPhase.PHASE_4,
        todayLikes: 30,
        todayComments: 5,
        todayShares: 2,
        todayFollows: 10,
      };

      expect(EngagementRateLimiter.isActionDistributionNatural(metrics)).toBe(true);
    });
  });
});
