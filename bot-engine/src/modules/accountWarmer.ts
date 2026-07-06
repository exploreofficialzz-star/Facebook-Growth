/**
 * Account Warming Scheduler Module
 * Gradually increases activity for new accounts over a 14-day warm-up period
 */

export enum WarmingPhase {
  PHASE_1_PASSIVE = 1,      // Days 1-3: Passive browsing only
  PHASE_2_LIGHT = 2,        // Days 4-7: Light engagement (profile views, page follows)
  PHASE_3_MODERATE = 3,     // Days 8-11: Moderate engagement (likes, basic comments)
  PHASE_4_ACTIVE = 4,       // Days 12-14: Active engagement (more comments, shares)
  PHASE_5_FULL = 5,         // Day 15+: Full engagement
}

export interface WarmingSchedule {
  phase: WarmingPhase;
  dayRange: [number, number];
  activities: string[];
  dailyActivityDuration: number; // in minutes
  minSessionsPerDay: number;
  maxSessionsPerDay: number;
}

export interface AccountWarmingState {
  accountId: string;
  createdAt: Date;
  currentPhase: WarmingPhase;
  daysActive: number;
  sessionsCompleted: number;
  lastSessionDate: Date;
  isWarmed: boolean;
}

export class AccountWarmer {
  /**
   * Get the warming schedule for each phase
   */
  static getWarmingSchedule(): Record<WarmingPhase, WarmingSchedule> {
    return {
      [WarmingPhase.PHASE_1_PASSIVE]: {
        phase: WarmingPhase.PHASE_1_PASSIVE,
        dayRange: [1, 3],
        activities: [
          'browse_newsfeed',
          'watch_videos',
          'view_profiles',
          'scroll_pages',
        ],
        dailyActivityDuration: 15, // 15 minutes per day
        minSessionsPerDay: 1,
        maxSessionsPerDay: 2,
      },
      [WarmingPhase.PHASE_2_LIGHT]: {
        phase: WarmingPhase.PHASE_2_LIGHT,
        dayRange: [4, 7],
        activities: [
          'browse_newsfeed',
          'watch_videos',
          'view_profiles',
          'follow_pages',
          'like_posts', // Start liking
        ],
        dailyActivityDuration: 20,
        minSessionsPerDay: 1,
        maxSessionsPerDay: 2,
      },
      [WarmingPhase.PHASE_3_MODERATE]: {
        phase: WarmingPhase.PHASE_3_MODERATE,
        dayRange: [8, 11],
        activities: [
          'browse_newsfeed',
          'watch_videos',
          'like_posts',
          'comment_posts', // Start commenting
          'follow_pages',
          'view_profiles',
        ],
        dailyActivityDuration: 25,
        minSessionsPerDay: 1,
        maxSessionsPerDay: 3,
      },
      [WarmingPhase.PHASE_4_ACTIVE]: {
        phase: WarmingPhase.PHASE_4_ACTIVE,
        dayRange: [12, 14],
        activities: [
          'browse_newsfeed',
          'watch_videos',
          'like_posts',
          'comment_posts',
          'share_posts', // Start sharing
          'follow_pages',
          'follow_users',
        ],
        dailyActivityDuration: 30,
        minSessionsPerDay: 1,
        maxSessionsPerDay: 3,
      },
      [WarmingPhase.PHASE_5_FULL]: {
        phase: WarmingPhase.PHASE_5_FULL,
        dayRange: [15, 999],
        activities: [
          'browse_newsfeed',
          'watch_videos',
          'like_posts',
          'comment_posts',
          'share_posts',
          'follow_pages',
          'follow_users',
          'join_groups',
        ],
        dailyActivityDuration: 45,
        minSessionsPerDay: 1,
        maxSessionsPerDay: 4,
      },
    };
  }

  /**
   * Determine the current warming phase based on account age
   */
  static getCurrentPhase(daysActive: number): WarmingPhase {
    if (daysActive <= 3) return WarmingPhase.PHASE_1_PASSIVE;
    if (daysActive <= 7) return WarmingPhase.PHASE_2_LIGHT;
    if (daysActive <= 11) return WarmingPhase.PHASE_3_MODERATE;
    if (daysActive <= 14) return WarmingPhase.PHASE_4_ACTIVE;
    return WarmingPhase.PHASE_5_FULL;
  }

  /**
   * Get the warming schedule for the current phase
   */
  static getScheduleForPhase(phase: WarmingPhase): WarmingSchedule {
    return this.getWarmingSchedule()[phase];
  }

  /**
   * Calculate days remaining in current phase
   */
  static getDaysRemainingInPhase(daysActive: number): number {
    const phase = this.getCurrentPhase(daysActive);
    const schedule = this.getScheduleForPhase(phase);
    const [, endDay] = schedule.dayRange;

    if (phase === WarmingPhase.PHASE_5_FULL) {
      return 0; // No end to final phase
    }

    return Math.max(0, endDay - daysActive);
  }

  /**
   * Get recommended activities for today
   */
  static getTodayActivities(daysActive: number): string[] {
    const phase = this.getCurrentPhase(daysActive);
    const schedule = this.getScheduleForPhase(phase);
    return schedule.activities;
  }

  /**
   * Get recommended number of sessions for today
   */
  static getRecommendedSessionsForToday(daysActive: number): number {
    const phase = this.getCurrentPhase(daysActive);
    const schedule = this.getScheduleForPhase(phase);
    return Math.floor(
      Math.random() * (schedule.maxSessionsPerDay - schedule.minSessionsPerDay + 1) +
      schedule.minSessionsPerDay
    );
  }

  /**
   * Get recommended session duration for today
   */
  static getRecommendedSessionDuration(daysActive: number): number {
    const phase = this.getCurrentPhase(daysActive);
    const schedule = this.getScheduleForPhase(phase);

    // Add some variance to the duration (±5 minutes)
    const variance = (Math.random() - 0.5) * 10;
    return (schedule.dailyActivityDuration + variance) * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Check if account is fully warmed up
   */
  static isFullyWarmed(daysActive: number): boolean {
    return daysActive >= 15;
  }

  /**
   * Get warming progress percentage
   */
  static getWarmingProgress(daysActive: number): number {
    if (daysActive >= 15) return 100;
    return Math.min(100, (daysActive / 15) * 100);
  }

  /**
   * Get warming status summary
   */
  static getWarmingStatus(daysActive: number): {
    phase: WarmingPhase;
    progress: number;
    daysRemaining: number;
    isFullyWarmed: boolean;
    nextPhaseIn: number;
  } {
    const phase = this.getCurrentPhase(daysActive);
    const progress = this.getWarmingProgress(daysActive);
    const daysRemaining = this.getDaysRemainingInPhase(daysActive);
    const isFullyWarmed = this.isFullyWarmed(daysActive);

    const schedule = this.getScheduleForPhase(phase);
    const [, endDay] = schedule.dayRange;
    const nextPhaseIn = Math.max(0, endDay - daysActive + 1);

    return {
      phase,
      progress,
      daysRemaining,
      isFullyWarmed,
      nextPhaseIn,
    };
  }

  /**
   * Generate a warming schedule for the next N days
   */
  static generateWarmingSchedule(daysActive: number, daysAhead: number = 7): Array<{
    day: number;
    phase: WarmingPhase;
    activities: string[];
    sessions: number;
    duration: number;
  }> {
    const schedule = [];

    for (let i = 0; i < daysAhead; i++) {
      const day = daysActive + i;
      const phase = this.getCurrentPhase(day);
      const activities = this.getTodayActivities(day);
      const sessions = this.getRecommendedSessionsForToday(day);
      const duration = this.getRecommendedSessionDuration(day);

      schedule.push({
        day,
        phase,
        activities,
        sessions,
        duration,
      });
    }

    return schedule;
  }

  /**
   * Validate if account activity matches warming phase expectations
   */
  static validateActivityCompliance(
    daysActive: number,
    performedActivities: string[]
  ): {
    isCompliant: boolean;
    violations: string[];
  } {
    const allowedActivities = this.getTodayActivities(daysActive);
    const violations: string[] = [];

    for (const activity of performedActivities) {
      if (!allowedActivities.includes(activity)) {
        violations.push(`Activity '${activity}' not allowed in current phase`);
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Get phase transition recommendations
   */
  static getPhaseTransitionRecommendations(daysActive: number): string[] {
    const phase = this.getCurrentPhase(daysActive);
    const recommendations: string[] = [];

    switch (phase) {
      case WarmingPhase.PHASE_1_PASSIVE:
        recommendations.push('Account is in passive browsing phase');
        recommendations.push('No engagement actions should be performed');
        recommendations.push('Focus on building account history');
        break;

      case WarmingPhase.PHASE_2_LIGHT:
        recommendations.push('Account is transitioning to light engagement');
        recommendations.push('Start following relevant pages');
        recommendations.push('Begin liking posts from followed pages');
        break;

      case WarmingPhase.PHASE_3_MODERATE:
        recommendations.push('Account is in moderate engagement phase');
        recommendations.push('Increase comment frequency');
        recommendations.push('Maintain natural like/comment ratio');
        break;

      case WarmingPhase.PHASE_4_ACTIVE:
        recommendations.push('Account is in active engagement phase');
        recommendations.push('Begin sharing posts');
        recommendations.push('Start following individual users');
        break;

      case WarmingPhase.PHASE_5_FULL:
        recommendations.push('Account is fully warmed and ready for full engagement');
        recommendations.push('All engagement types are now available');
        break;
    }

    return recommendations;
  }
}
