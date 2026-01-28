/**
 * core/grouper.ts - 策略组构建核心逻辑
 * 
 * 负责构建 Surge 的 [Proxy Group] 部分。
 * 核心逻辑下沉至此，Route 层不再处理具体的策略组拼接。
 */

import { 
  kRegionConfig, 
  kRuleSet, 
  kSurgeConfig, 
  kCompanyConfig,
  RegionConfig 
} from '../config/index';

// ============================================================
// Helper Functions (Internal)
// ============================================================

/**
 * 获取排序后的地区配置列表
 */
const getSortedRegions = (): [string, RegionConfig][] => {
  return Object.entries(kRegionConfig).sort((a, b) => a[1].order - b[1].order);
};

/**
 * 按地区对节点做分组 (Profile Mode Only)
 */
const bucketProxyByRegion = (proxyNames: string[]): Record<string, string[]> => {
  const buckets: Record<string, string[]> = {};
  for (const regionKey of Object.keys(kRegionConfig)) {
    buckets[regionKey] = [];
  }

  for (const name of proxyNames) {
    const lower = name.toLowerCase();
    const upper = name.toUpperCase();
    let matched = false;

    for (const [regionKey, config] of Object.entries(kRegionConfig)) {
      for (const pattern of config.matchPatterns) {
        const patternLower = pattern.toLowerCase();
        const patternUpper = pattern.toUpperCase();

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
 * 构建标准策略组列表 (Select Group)
 */
const buildStandardGroups = (
  allNodesName: string,
  excludeHKAndTW: boolean = false,
  isExternalMode: boolean = false,
  regionGroupNames?: Record<string, string[]>,
  regionBuckets?: Record<string, string[]>,
  ruleName?: string,
  extraGroups?: string[]
): string[] => {
  let baseGroups: string[];
  const ruleConfig = ruleName ? kRuleSet[ruleName] : undefined;
  const optimizeType = ruleConfig?.optimizeGroup;

  if (optimizeType === "ai") {
    baseGroups = ["🎧 Vibe-Coding", allNodesName, "🌐 全球直连"];
  } else if (optimizeType === "apple") {
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName];
  } else if (ruleName === "__final__") {
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName];
  } else {
    baseGroups = ["🌐 全球直连", allNodesName, "🎧 Vibe-Coding"];
  }

  const groups: string[] = [...baseGroups];
  if (extraGroups && extraGroups.length > 0) {
    groups.push(...extraGroups);
  }

  for (const [regionKey, config] of getSortedRegions()) {
    if (excludeHKAndTW && config.excludeOnHKAndTW) continue;

    const names = regionGroupNames?.[regionKey];
    if (names && names.length > 0) {
      if (!isExternalMode) {
        if (regionBuckets && regionBuckets[regionKey]?.length === 0) continue;
      }
      groups.push(...names);
    }
  }

  return groups;
};

// ============================================================
// Public Builders
// ============================================================

/**
 * 构建 Provider Mode (外部节点) 的策略组
 */
export const buildProviderProxyGroups = (): string => {
  let result = "";

  if (kSurgeConfig.length === 0) {
    return "⚡ Final = select, 🌐 全球直连\n";
  }

  result += "# > 外部节点 (Provider Mode)\n";
  result += "# 使用 policy-path 自动更新，smart 策略组自动选择最优节点\n\n";

  const allNodesName = "🚀 所有节点";
  const sortedRegions = getSortedRegions();
  const regionAllGroupsMap: Record<string, string[]> = {};
  const vibeCodingFinal: string[] = [];

  // 1. 生成地区策略组
  for (const [regionKey, config] of sortedRegions) {
    const regionAllGroups: string[] = [];
    const regionAggregateName = `${config.emoji} ${config.name}节点`;
    const regionManualName = `${config.emoji} ${config.name}-手动`;

    if (config.onlyManual) {
      regionAllGroups.push(regionAggregateName);
      const allSubGroups: string[] = [];
      kSurgeConfig.forEach(([subName, subUrl]) => {
        const subGroupName = `${config.emoji} ${config.name}-${subName}`;
        allSubGroups.push(subGroupName);
        regionAllGroups.push(subGroupName);
        result += `${subGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`;
      });
      result += `${regionAggregateName} = select, ${allSubGroups.join(",")}\n`;
      regionAllGroupsMap[regionKey] = regionAllGroups;
      continue;
    }

    regionAllGroups.push(regionAggregateName);
    if (config.hasManualGroup) {
      regionAllGroups.push(regionManualName);
    }

    const regionSubGroupsAuto: string[] = [];
    const regionSubGroupsManual: string[] = [];

    kSurgeConfig.forEach(([subName, subUrl]) => {
      // Smart Group
      const subGroupName = `${config.emoji} ${config.name}-${subName}`;
      regionSubGroupsAuto.push(subGroupName);
      regionAllGroups.push(subGroupName);
      result += `${subGroupName} = smart, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`;

      if (config.includeInVibeGroup) {
        vibeCodingFinal.push(subGroupName);
      }

      // Manual Group
      if (config.hasManualGroup) {
        const subManualGroupName = `${config.emoji} ${config.name}-${subName}-手动`;
        regionSubGroupsManual.push(subManualGroupName);
        result += `${subManualGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`;
      }
    });

    // 聚合组
    result += `${regionAggregateName} = url-test, include-other-group="${regionSubGroupsAuto.join(",")}", url=http://www.gstatic.com/generate_204, interval=600, tolerance=100, timeout=5\n`;

    if (config.hasManualGroup) {
      result += `${regionManualName} = select, ${regionSubGroupsManual.join(",")}\n`;
    }

    regionAllGroupsMap[regionKey] = regionAllGroups;

    // Vibe-Coding candidates
    if (config.includeInVibeGroup) {
      vibeCodingFinal.unshift(regionAggregateName);
      if (config.hasManualGroup) {
        vibeCodingFinal.splice(1, 0, regionManualName);
      }
    }
  }

  // 2. 全局聚合
  const globalSubGroups: string[] = [];
  kSurgeConfig.forEach(([subName, subUrl]) => {
    const globalSubGroupName = `☁️ ${subName}-所有节点`;
    globalSubGroups.push(globalSubGroupName);
    result += `${globalSubGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`;
  });

  result += `\n${allNodesName} = select, include-other-group="${globalSubGroups.join(",")}", update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`;

  // 3. Vibe-Coding
  if (vibeCodingFinal.length > 0) {
    result += "\n# > 组合策略组\n";
    result += `🎧 Vibe-Coding = select, ${vibeCodingFinal.join(", ")}\n`;
  }

  // 4. 业务分流
  result += "\n# > 业务分流策略组\n";
  for (const [item, rule] of Object.entries(kRuleSet)) {
    if (rule.type === "direct") continue;
    const groupName = rule.emoji ? `${rule.emoji} ${item}` : item;
    const groups = buildStandardGroups(
      allNodesName,
      rule.excludeHKAndTW || false,
      true,
      regionAllGroupsMap,
      undefined,
      item
    );
    result += `${groupName} = select, ${groups.join(", ")}\n`;
  }

  // 5. Final
  result += "\n# > 最终策略\n";
  const finalGroups = buildStandardGroups(
    allNodesName,
    false,
    true,
    regionAllGroupsMap,
    undefined,
    "__final__"
  );
  result += `⚡ Final = select, ${finalGroups.join(", ")}\n`;

  return result;
};

/**
 * 构建 Profile Mode (解析节点) 的策略组
 */
export const buildProfileProxyGroups = (proxyNames: string[]): string => {
  let result = "";
  
  result += "# > 基础策略组\n";
  result += "🚀 所有节点 = select, " + proxyNames.join(", ") + "\n";

  const regionBuckets = bucketProxyByRegion(proxyNames);
  const sortedRegions = getSortedRegions();
  const regionGroupNames: Record<string, string[]> = {};
  const vibeCodingGroups: string[] = [];

  if (proxyNames.length > 0) {
    result += "\n# > 地区策略组\n";

    for (const [regionKey, config] of sortedRegions) {
      const nodes = regionBuckets[regionKey] || [];
      if (nodes.length === 0) continue;

      // 自动策略组
      const autoGroupName = `${config.emoji} ${config.name}节点`;
      result += `# ${config.name}地区自动选择\n`;
      result += `${autoGroupName} = url-test, ${nodes.join(", ")}, url=http://www.gstatic.com/generate_204, interval=600, tolerance=100, timeout=5\n`;

      if (!regionGroupNames[regionKey]) regionGroupNames[regionKey] = [];
      regionGroupNames[regionKey].push(autoGroupName);

      if (config.includeInVibeGroup) {
        vibeCodingGroups.push(autoGroupName);
      }

      // 手动策略组
      if (config.hasManualGroup) {
        const manualGroupName = `${config.emoji} ${config.name}-手动`;
        result += `${manualGroupName} = select, ${nodes.join(", ")}\n`;
        regionGroupNames[regionKey].push(manualGroupName);

        if (config.includeInVibeGroup) {
          vibeCodingGroups.push(manualGroupName);
        }
      }
    }

    // Vibe-Coding
    if (vibeCodingGroups.length > 0) {
      result += "\n# > 组合策略组\n";
      result += `🎧 Vibe-Coding = select, ${vibeCodingGroups.join(", ")}\n`;
    }
  }

  // 业务分流
  result += "\n# > 业务分流策略组\n";
  for (const [item, rule] of Object.entries(kRuleSet)) {
    if (rule.type === "direct") continue;

    const groupName = rule.emoji ? `${rule.emoji} ${item}` : item;
    const groups = buildStandardGroups(
      "🚀 所有节点",
      rule.excludeHKAndTW || false,
      false,
      regionGroupNames,
      regionBuckets,
      item
    );
    result += `${groupName} = select, ${groups.join(", ")}\n`;
  }

  // Final
  result += "\n# > 最终策略\n";
  if (proxyNames.length > 0) {
    const finalGroups = buildStandardGroups(
      "🚀 所有节点",
      false,
      false,
      regionGroupNames,
      regionBuckets,
      "__final__"
    );
    result += "⚡ Final = select, " + finalGroups.join(", ") + "\n";
  } else {
    result += "⚡ Final = select, 🌐 全球直连, 🚀 所有节点, 🎧 Vibe-Coding\n";
  }

  return result;
};

/**
 * 构建公司内网分流规则 (Used by generator)
 */
export const buildCompanyRules = (): string[] => {
  if (!kCompanyConfig.enabled) return [];
  const rules: string[] = [];
  const policy = kCompanyConfig.policy;

  for (const domain of kCompanyConfig.domains) {
    if (domain.startsWith("*.")) {
      rules.push(`DOMAIN-SUFFIX,${domain.slice(2)},${policy}`);
    } else {
      rules.push(`DOMAIN-SUFFIX,${domain},${policy}`);
    }
  }
  for (const ip of kCompanyConfig.ips) {
    rules.push(`IP-CIDR,${ip},${policy},no-resolve`);
  }
  return rules;
};
