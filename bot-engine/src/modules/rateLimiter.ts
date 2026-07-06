/**
 * Engagement Rate Limiter Module
 * Enforces safe daily action limits based on account age and warm-up phase
 */

export enum WarmupPhase {
  PHASE_1 = 1, // Days 1-3: Passive browsing only
  PHASE_2 = 2, // Days 4-7: Light engagement
  PHASE_3 = 3, // Days 8-14: Moderate engagement
  PHASE_4 = 4, // Day 15+: Full engagement
}

export interface ActionLimits {
  likes: number;
  comments: number;
  shares: number;
  follows: number;
}

export interface AccountMetrics {
  accountAgeInDays: number;
  warmupPhase: WarmupPhase;
  todayLikes: number;
  todayComments: number;
  todayShares: number;
  todayFollows: number;
}

export class EngagementRateLimiter {
  /**
   * Determine the warm-up phase based on account age
   */
  static getWarmupPhase(accountAgeInDays: number): WarmupPhase {
    if (accountAgeInDays <= 3) return WarmupPhase.PHASE_1;
    if (accountAgeInDays <= 7) return WarmupPhase.PHASE_2;
    if (accountAgeInDays <= 14) return WarmupPhase.PHASE_3;
    return WarmupPhase.PHASE_4;
  }

  /**
   * Get safe daily action limits based on warm-up phase
   * These limits are conservative to avoid triggering Facebook's anti-bot systems
   */
  static getDailyLimits(phase: WarmupPhase): ActionLimits {
    const limits: Record<WarmupPhase, ActionLimits> = {
      [WarmupPhase.PHASE_1]: {
        likes: 0, // No engagement in phase 1
        comments: 0,
        shares: 0,
        follows: 0,
      },
      [WarmupPhase.PHASE_2]: {
        likes: 5,
        comments: 2,
        shares: 1,
        follows: 3,
      },
      [WarmupPhase.PHASE_3]: {
        likes: 20,
        comments: 8,
        shares: 3,
        follows: 10,
      },
      [WarmupPhase.PHASE_4]: {
        likes: 50,
        comments: 20,
        shares: 8,
        follows: 25,
      },
    };

    return limits[phase];
  }

  /**
   * Check if an action can be performed based on current limits
   */
  static canPerformAction(
    actionType: 'like' | 'comment' | 'share' | 'follow',
    metrics: AccountMetrics
  ): boolean {
    const limits = this.getDailyLimits(metrics.warmupPhase);

    switch (actionType) {
      case 'like':
        return metrics.todayLikes < limits.likes;
      case 'comment':
        return metrics.todayComments < limits.comments;
      case 'share':
        return metrics.todayShares < limits.shares;
      case 'follow':
        return metrics.todayFollows < limits.follows;
      default:
        return false;
    }
  }

  /**
   * Get remaining action quota for the day
   */
  static getRemainingQuota(
    actionType: 'like' | 'comment' | 'share' | 'follow',
    metrics: AccountMetrics
  ): number {
    const limits = this.getDailyLimits(metrics.warmupPhase);

    switch (actionType) {
      case 'like':
        return Math.max(0, limits.likes - metrics.todayLikes);
      case 'comment':
        return Math.max(0, limits.comments - metrics.todayComments);
      case 'share':
        return Math.max(0, limits.shares - metrics.todayShares);
      case 'follow':
        return Math.max(0, limits.follows - metrics.todayFollows);
      default:
        return 0;
    }
  }

  /**
   * Calculate time until next action can be performed
   * Returns milliseconds to wait
   */
  static getTimeUntilNextAction(
    actionType: 'like' | 'comment' | 'share' | 'follow',
    metrics: AccountMetrics
  ): number {
    if (this.canPerformAction(actionType, metrics)) {
      return 0; // Can perform immediately
    }

    // If quota is exhausted, wait until next day (24 hours)
    return 24 * 60 * 60 * 1000;
  }

  /**
   * Get a safe random delay between actions
   * Varies based on warm-up phase to look more natural
   */
  static getSafeActionDelay(phase: WarmupPhase): number {
    const delayRanges: Record<WarmupPhase, [number, number]> = {
      [WarmupPhase.PHASE_1]: [30000, 60000], // 30-60 seconds
      [WarmupPhase.PHASE_2]: [20000, 45000], // 20-45 seconds
      [WarmupPhase.PHASE_3]: [15000, 40000], // 15-40 seconds
      [WarmupPhase.PHASE_4]: [10000, 30000], // 10-30 seconds
    };

    const [min, max] = delayRanges[phase];
    return Math.random() * (max - min) + min;
  }

  /**
   * Validate if action distribution looks natural
   * Prevents patterns like: 50 likes, 0 comments, 0 shares
   */
  static isActionDistributionNatural(metrics: AccountMetrics): boolean {
    const limits = this.getDailyLimits(metrics.warmupPhase);

    // If likes are being used but comments/shares are not, it looks suspicious
    if (metrics.todayLikes > 0 && metrics.todayComments === 0 && metrics.todayShares === 0) {
      // Allow this only if we're still in early phases
      if (metrics.warmupPhase <= WarmupPhase.PHASE_2) {
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Get recommended action sequence for the day
   * Returns a balanced mix of actions to look natural
   */
  static getRecommendedActionSequence(metrics: AccountMetrics): string[] {
    const limits = this.getDailyLimits(metrics.warmupPhase);
    const sequence: string[] = [];

    // Add actions proportionally to their limits
    const totalActions = limits.likes + limits.comments + limits.shares + limits.follows;
    if (totalActions === 0) return sequence;

    // Calculate how many of each action to perform
    const likesToDo = Math.floor((limits.likes / totalActions) * totalActions);
    const commentsToDo = Math.floor((limits.comments / totalActions) * totalActions);
    const sharesToDo = Math.floor((limits.shares / totalActions) * totalActions);
    const followsToDo = Math.floor((limits.follows / totalActions) * totalActions);

    // Build sequence
    for (let i = 0; i < likesToDo; i++) sequence.push('like');
    for (let i = 0; i < commentsToDo; i++) sequence.push('comment');
    for (let i = 0; i < sharesToDo; i++) sequence.push('share');
    for (let i = 0; i < followsToDo; i++) sequence.push('follow');

    // Shuffle for randomness
    return sequence.sort(() => Math.random() - 0.5);
  }
}
