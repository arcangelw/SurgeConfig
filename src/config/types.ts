/**
 * config/types.ts - Surge 配置类型定义
 */

export interface HelperConfig {
  subscribeUrl: string;
}

export interface RegionConfig {
  name: string;
  emoji: string;
  matchPatterns: string[];
  isCore?: boolean;
  order: number;
  hasManualGroup?: boolean;
  excludeOnHKAndTW?: boolean;
  includeInVibeGroup?: boolean;
  regexFilter?: string; // 用于 Policy-Path 的过滤
  onlyManual?: boolean; // 是否仅保留手动组（不生成自动/Smart组）
}

export interface RuleSetConfig {
  url: string[]; // Support multiple URLs for redundancy
  type: "proxy" | "direct" | "reject";
  emoji?: string;
  excludeHKAndTW?: boolean;
  optimizeGroup?: "ai" | "apple" | "other"; // 用于调整候选策略组顺序
}

export interface CompanyConfig {
  enabled: boolean;
  name: string;
  domains: string[];
  ips: string[];
  skipProxy: string[];
  policy: string;
}

export enum Platform {
  MAC = "mac",
  IOS = "ios",
}
