/**
 * Shared Types for Facebook Growth Platform
 */

import { z } from 'zod';

// Campaign Types
export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Campaign {
  id: string;
  userId: string;
  facebookPageUrl: string;
  facebookPageId?: string;
  targetFollowers: number;
  targetLikes: number;
  targetComments: number;
  targetShares: number;
  currentFollowers: number;
  currentLikes: number;
  currentComments: number;
  currentShares: number;
  status: CampaignStatus;
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Bot Account Types
export enum BotAccountStatus {
  WARMING = 'warming',
  ACTIVE = 'active',
  PAUSED = 'paused',
  BANNED = 'banned',
  INACTIVE = 'inactive',
}

export interface BotAccount {
  id: string;
  userId: string;
  facebookEmail: string;
  facebookUsername: string;
  status: BotAccountStatus;
  warmupPhase: number; // 1-5
  daysActive: number;
  lastActivityAt?: Date;
  proxyId?: string;
  todayLikes: number;
  todayComments: number;
  todayShares: number;
  todayFollows: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalFollows: number;
  createdAt: Date;
  updatedAt: Date;
}

// Proxy Types
export enum ProxyType {
  MOBILE = 'mobile',
  RESIDENTIAL = 'residential',
  DATACENTER = 'datacenter',
}

export interface Proxy {
  id: string;
  userId: string;
  type: ProxyType;
  address: string;
  port: number;
  username?: string;
  password?: string;
  status: 'active' | 'inactive' | 'unhealthy';
  successRate: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Activity Log Types
export enum ActivityType {
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  FOLLOW = 'follow',
  BROWSE = 'browse',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export interface ActivityLog {
  id: string;
  campaignId: string;
  botAccountId: string;
  actionType: ActivityType;
  targetPostUrl?: string;
  targetPageUrl?: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  timestamp: Date;
  createdAt: Date;
}

// API Request/Response Types
export interface CreateCampaignRequest {
  facebookPageUrl: string;
  targetFollowers: number;
  targetLikes: number;
  targetComments: number;
  targetShares: number;
}

export interface UpdateCampaignRequest {
  targetFollowers?: number;
  targetLikes?: number;
  targetComments?: number;
  targetShares?: number;
  status?: CampaignStatus;
}

export interface CreateBotAccountRequest {
  facebookEmail: string;
  facebookPassword: string;
  proxyId?: string;
}

export interface AddProxyRequest {
  type: ProxyType;
  address: string;
  port: number;
  username?: string;
  password?: string;
}

// Zod Schemas for Validation
export const CreateCampaignSchema = z.object({
  facebookPageUrl: z.string().url('Invalid Facebook page URL'),
  targetFollowers: z.number().int().positive('Must be a positive number'),
  targetLikes: z.number().int().nonnegative('Must be non-negative'),
  targetComments: z.number().int().nonnegative('Must be non-negative'),
  targetShares: z.number().int().nonnegative('Must be non-negative'),
});

export const CreateBotAccountSchema = z.object({
  facebookEmail: z.string().email('Invalid email address'),
  facebookPassword: z.string().min(6, 'Password must be at least 6 characters'),
  proxyId: z.string().optional(),
});

export const AddProxySchema = z.object({
  type: z.enum(['mobile', 'residential', 'datacenter']),
  address: z.string().ip('Invalid IP address'),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Dashboard Statistics
export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBotAccounts: number;
  activeBotAccounts: number;
  totalProxies: number;
  healthyProxies: number;
  totalEngagements: number;
  todayEngagements: number;
}

// Warming Status
export interface WarmingStatus {
  phase: number;
  progress: number; // 0-100
  daysRemaining: number;
  isFullyWarmed: boolean;
  nextPhaseIn: number;
}

// Campaign Progress
export interface CampaignProgress {
  campaignId: string;
  followersProgress: number; // 0-100
  likesProgress: number; // 0-100
  commentsProgress: number; // 0-100
  sharesProgress: number; // 0-100
  overallProgress: number; // 0-100
  estimatedCompletionDate?: Date;
}
