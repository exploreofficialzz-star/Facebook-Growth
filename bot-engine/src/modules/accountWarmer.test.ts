import { describe, it, expect } from 'vitest';
import { AccountWarmer, WarmingPhase } from './accountWarmer';

describe('AccountWarmer', () => {
  describe('getCurrentPhase', () => {
    it('should return PHASE_1_PASSIVE for days 1-3', () => {
      expect(AccountWarmer.getCurrentPhase(1)).toBe(WarmingPhase.PHASE_1_PASSIVE);
      expect(AccountWarmer.getCurrentPhase(2)).toBe(WarmingPhase.PHASE_1_PASSIVE);
      expect(AccountWarmer.getCurrentPhase(3)).toBe(WarmingPhase.PHASE_1_PASSIVE);
    });

    it('should return PHASE_2_LIGHT for days 4-7', () => {
      expect(AccountWarmer.getCurrentPhase(4)).toBe(WarmingPhase.PHASE_2_LIGHT);
      expect(AccountWarmer.getCurrentPhase(7)).toBe(WarmingPhase.PHASE_2_LIGHT);
    });

    it('should return PHASE_3_MODERATE for days 8-11', () => {
      expect(AccountWarmer.getCurrentPhase(8)).toBe(WarmingPhase.PHASE_3_MODERATE);
      expect(AccountWarmer.getCurrentPhase(11)).toBe(WarmingPhase.PHASE_3_MODERATE);
    });

    it('should return PHASE_4_ACTIVE for days 12-14', () => {
      expect(AccountWarmer.getCurrentPhase(12)).toBe(WarmingPhase.PHASE_4_ACTIVE);
      expect(AccountWarmer.getCurrentPhase(14)).toBe(WarmingPhase.PHASE_4_ACTIVE);
    });

    it('should return PHASE_5_FULL for day 15+', () => {
      expect(AccountWarmer.getCurrentPhase(15)).toBe(WarmingPhase.PHASE_5_FULL);
      expect(AccountWarmer.getCurrentPhase(100)).toBe(WarmingPhase.PHASE_5_FULL);
    });
  });

  describe('getDaysRemainingInPhase', () => {
    it('should calculate days remaining correctly', () => {
      expect(AccountWarmer.getDaysRemainingInPhase(1)).toBe(2);
      expect(AccountWarmer.getDaysRemainingInPhase(3)).toBe(0);
      expect(AccountWarmer.getDaysRemainingInPhase(4)).toBe(3);
      expect(AccountWarmer.getDaysRemainingInPhase(7)).toBe(0);
    });

    it('should return 0 for final phase', () => {
      expect(AccountWarmer.getDaysRemainingInPhase(15)).toBe(0);
      expect(AccountWarmer.getDaysRemainingInPhase(100)).toBe(0);
    });
  });

  describe('getTodayActivities', () => {
    it('should return only passive activities for phase 1', () => {
      const activities = AccountWarmer.getTodayActivities(1);
      expect(activities).toContain('browse_newsfeed');
      expect(activities).toContain('watch_videos');
      expect(activities).not.toContain('like_posts');
      expect(activities).not.toContain('comment_posts');
    });

    it('should include engagement activities in later phases', () => {
      const activities = AccountWarmer.getTodayActivities(5);
      expect(activities).toContain('like_posts');

      const phase3Activities = AccountWarmer.getTodayActivities(10);
      expect(phase3Activities).toContain('comment_posts');
    });
  });

  describe('isFullyWarmed', () => {
    it('should return false for accounts under 15 days old', () => {
      expect(AccountWarmer.isFullyWarmed(1)).toBe(false);
      expect(AccountWarmer.isFullyWarmed(7)).toBe(false);
      expect(AccountWarmer.isFullyWarmed(14)).toBe(false);
    });

    it('should return true for accounts 15+ days old', () => {
      expect(AccountWarmer.isFullyWarmed(15)).toBe(true);
      expect(AccountWarmer.isFullyWarmed(100)).toBe(true);
    });
  });

  describe('getWarmingProgress', () => {
    it('should return 0 for brand new accounts', () => {
      expect(AccountWarmer.getWarmingProgress(0)).toBe(0);
    });

    it('should return 100 for fully warmed accounts', () => {
      expect(AccountWarmer.getWarmingProgress(15)).toBe(100);
      expect(AccountWarmer.getWarmingProgress(100)).toBe(100);
    });

    it('should return proportional progress for intermediate ages', () => {
      const progress7 = AccountWarmer.getWarmingProgress(7);
      expect(progress7).toBeGreaterThan(0);
      expect(progress7).toBeLessThan(100);
      expect(progress7).toBeCloseTo((7 / 15) * 100, 1);
    });
  });

  describe('getWarmingStatus', () => {
    it('should return complete status for new account', () => {
      const status = AccountWarmer.getWarmingStatus(1);
      expect(status.phase).toBe(WarmingPhase.PHASE_1_PASSIVE);
      expect(status.progress).toBeLessThan(100);
      expect(status.isFullyWarmed).toBe(false);
    });

    it('should return complete status for fully warmed account', () => {
      const status = AccountWarmer.getWarmingStatus(15);
      expect(status.phase).toBe(WarmingPhase.PHASE_5_FULL);
      expect(status.progress).toBe(100);
      expect(status.isFullyWarmed).toBe(true);
    });
  });

  describe('generateWarmingSchedule', () => {
    it('should generate schedule for requested days', () => {
      const schedule = AccountWarmer.generateWarmingSchedule(1, 7);
      expect(schedule).toHaveLength(7);
    });

    it('should include all required fields in schedule', () => {
      const schedule = AccountWarmer.generateWarmingSchedule(1, 1);
      expect(schedule[0]).toHaveProperty('day');
      expect(schedule[0]).toHaveProperty('phase');
      expect(schedule[0]).toHaveProperty('activities');
      expect(schedule[0]).toHaveProperty('sessions');
      expect(schedule[0]).toHaveProperty('duration');
    });

    it('should show phase transitions in schedule', () => {
      const schedule = AccountWarmer.generateWarmingSchedule(2, 5);
      const phases = schedule.map(s => s.phase);
      
      // Should transition from PHASE_1 to PHASE_2
      expect(phases).toContain(WarmingPhase.PHASE_1_PASSIVE);
      expect(phases).toContain(WarmingPhase.PHASE_2_LIGHT);
    });
  });

  describe('validateActivityCompliance', () => {
    it('should accept valid activities for phase', () => {
      const result = AccountWarmer.validateActivityCompliance(1, ['browse_newsfeed', 'watch_videos']);
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject invalid activities for phase', () => {
      const result = AccountWarmer.validateActivityCompliance(1, ['like_posts', 'comment_posts']);
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should allow valid activities in later phases', () => {
      const result = AccountWarmer.validateActivityCompliance(10, ['like_posts', 'comment_posts']);
      expect(result.isCompliant).toBe(true);
    });
  });

  describe('getPhaseTransitionRecommendations', () => {
    it('should provide recommendations for each phase', () => {
      const phase1Recs = AccountWarmer.getPhaseTransitionRecommendations(1);
      expect(phase1Recs.length).toBeGreaterThan(0);

      const phase2Recs = AccountWarmer.getPhaseTransitionRecommendations(5);
      expect(phase2Recs.length).toBeGreaterThan(0);
    });

    it('should mention no engagement in phase 1', () => {
      const recs = AccountWarmer.getPhaseTransitionRecommendations(1);
      const hasNoEngagementMessage = recs.some(r => r.toLowerCase().includes('no engagement'));
      expect(hasNoEngagementMessage).toBe(true);
    });
  });
});
