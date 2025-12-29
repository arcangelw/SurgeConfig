/**
 * grouper.ts - 策略组构建模块
 *
 * 负责构建 Surge 策略组，包括：
 * - 地区分组（按节点名称匹配）
 * - Vibe-Coding 组合策略
 * - 业务分流策略组
 */

import { kRuleSet, kRegionConfig, kSurgeConfig, kCompanyConfig } from '../config/index';

/**
 * 按地区对节点做分组
 * @param proxyNames 节点名称列表
 * @returns 按地区分组的节点映射
 */
export const bucketProxyByRegion = (proxyNames: string[]): Record<string, string[]> => {
  const buckets: Record<string, string[]> = {};

  // 初始化所有地区的桶
  for (const regionKey of Object.keys(kRegionConfig)) {
    buckets[regionKey] = [];
  }

  for (const name of proxyNames) {
    const lower = name.toLowerCase();
    const upper = name.toUpperCase();
    let matched = false;

    // 遍历所有地区配置，匹配节点名称
    for (const [regionKey, config] of Object.entries(kRegionConfig)) {
      for (const pattern of config.matchPatterns) {
        const patternLower = pattern.toLowerCase();
        const patternUpper = pattern.toUpperCase();

        // 匹配逻辑：包含关键词
        if (
          name.includes(pattern) ||
          lower.includes(patternLower) ||
          upper.includes(patternUpper) ||
          (patternUpper === "TW" && /[-_\s]tw\b/i.test(name))
        ) {
          buckets[regionKey].push(name);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  return buckets;
};

/**
 * 获取排序后的地区配置列表
 */
export const getSortedRegions = () => {
  return Object.entries(kRegionConfig).sort((a, b) => a[1].order - b[1].order);
};

/**
 * 获取核心地区配置（isCore: true）
 */
export const getCoreRegions = () => {
  return getSortedRegions().filter(([, config]) => config.isCore);
};

/**
 * 获取其他地区配置（isCore: false 或未定义）
 */
export const getOtherRegions = () => {
  return getSortedRegions().filter(([, config]) => !config.isCore);
};

/**
 * 构建标准策略组列表
 * @param allNodesName 所有节点策略组名称
 * @param excludeHKAndTW 是否排除香港和台湾
 * @param isExternalMode 是否为外部节点模式
 * @param regionGroupNames 地区策略组名称映射
 * @param regionBuckets 地区节点分桶
 * @param ruleName 业务名称（用于优化候选顺序）
 * @param extraGroups 额外分组
 */
export const buildStandardGroups = (
  allNodesName: string,
  excludeHKAndTW: boolean = false,
  isExternalMode: boolean = false,
  regionGroupNames?: Record<string, string[]>,
  regionBuckets?: Record<string, string[]>,
  ruleName?: string,
  extraGroups?: string[]
): string[] => {
  // 根据业务类型对基础候选顺序做优化
  let baseGroups: string[];
  const ruleConfig = ruleName ? kRuleSet[ruleName] : undefined;
  const optimizeType = ruleConfig?.optimizeGroup;

  if (optimizeType === "ai") {
    // AI / 开发相关：优先推荐 🎧 Vibe-Coding
    baseGroups = ["🎧 Vibe-Coding", allNodesName, "🌐 全球直连"];
  } else if (optimizeType === "apple") {
    // Apple：默认优先直连
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName];
  } else if (ruleName === "__final__") {
    // Final 兜底
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName];
  } else {
    // 其他业务
    baseGroups = ["🌐 全球直连", allNodesName, "🎧 Vibe-Coding"];
  }

  const groups: string[] = [...baseGroups];

  // 插入额外分组
  if (extraGroups && extraGroups.length > 0) {
    groups.push(...extraGroups);
  }

  // 按配置顺序添加地区组
  for (const [regionKey, config] of getSortedRegions()) {
    if (excludeHKAndTW && config.excludeOnHKAndTW) {
      continue;
    }

    const names = regionGroupNames?.[regionKey];
    if (names && names.length > 0) {
      if (!isExternalMode) {
        // 解析节点模式：检查是否有节点
        if (regionBuckets && regionBuckets[regionKey]?.length === 0) {
          continue;
        }
      }
      groups.push(...names);
    }
  }

  return groups;
};

/**
 * 构建公司内网规则
 * @returns 公司内网规则数组
 */
export const buildCompanyRules = (): string[] => {
  if (!kCompanyConfig.enabled) {
    return [];
  }

  const rules: string[] = [];
  const policy = kCompanyConfig.policy;

  // 域名规则
  for (const domain of kCompanyConfig.domains) {
    if (domain.startsWith("*.")) {
      // 通配符域名
      rules.push(`DOMAIN-SUFFIX,${domain.slice(2)},${policy}`);
    } else {
      rules.push(`DOMAIN-SUFFIX,${domain},${policy}`);
    }
  }

  // IP 规则
  for (const ip of kCompanyConfig.ips) {
    rules.push(`IP-CIDR,${ip},${policy},no-resolve`);
  }

  return rules;
};

/**
 * 构建 Vibe-Coding 策略组的候选列表
 * @param isExternalMode 是否为外部节点模式
 * @param regionGroupNames 地区策略组名称映射（外部模式）
 * @param regionBuckets 地区节点分桶（解析模式）
 */
export const buildVibeCodingCandidates = (
  isExternalMode: boolean,
  regionGroupNames?: Record<string, string[]>,
  regionBuckets?: Record<string, string[]>
): string[] => {
  const candidates: string[] = [];

  // 遍历核心地区，找出 includeInVibeGroup 的地区
  for (const [regionKey, config] of getSortedRegions()) {
    if (!config.includeInVibeGroup) continue;

    if (isExternalMode) {
      // 外部节点模式：使用聚合组名称
      const groupName = `${config.emoji} ${config.name}节点`;
      candidates.push(groupName);

      if (config.hasManualGroup) {
        candidates.push(`${config.emoji} ${config.name}-手动`);
      }

      // 添加订阅级别的细分
      for (const [subName] of kSurgeConfig) {
        candidates.push(`${config.emoji} ${config.name}-${subName}`);
      }
    } else {
      // 解析节点模式：只添加有节点的地区
      const nodes = regionBuckets?.[regionKey] || [];
      if (nodes.length === 0) continue;

      const groupName = `${config.emoji} ${config.name}节点`;
      candidates.push(groupName);

      if (config.hasManualGroup) {
        candidates.push(`${config.emoji} ${config.name}-手动`);
      }
    }
  }

  return candidates;
};

export { kRegionConfig, kRuleSet, kCompanyConfig };
