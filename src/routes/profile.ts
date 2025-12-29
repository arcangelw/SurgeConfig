/**
 * routes/profile.ts - Profile Mode 路由
 *
 * Profile Mode（原解析节点模式）：
 * - 从多个订阅下载并解析节点
 * - 生成完整的 Surge 配置文件
 *
 * 端点：
 * - /profile/mac - Mac (Surge 6)
 * - /profile/ios - iOS (Surge 5)
 */

import { Hono } from 'hono';
import { env } from 'bun';
import { downloadConfigs } from '../core/downloader';
import {
  buildSetting,
  buildProxy,
  buildRules,
  buildDNS,
  extendedConfig,
  getHostFromRequest,
} from '../core/generator';
import {
  bucketProxyByRegion,
  getSortedRegions,
  buildStandardGroups,
  buildVibeCodingCandidates,
  kRuleSet,
} from '../core/grouper';
import { kSettingMac, kSettingIOS, kGatewayHttpPort, kRegionConfig } from '../config/index';

const profile = new Hono();

/**
 * 构建解析节点模式的策略组
 */
const buildProxyGroup = (proxyNames: string[]): string => {
  let result = "[Proxy Group]\n";

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

  // 业务分流策略组
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
    result += "⚡ Final = select, " + finalGroups.join(", ") + "\n\n";
  } else {
    result += "⚡ Final = select, 🌐 全球直连, 🚀 所有节点, 🎧 Vibe-Coding\n\n";
  }

  return result;
};

// Mac (Surge 6) Profile Mode
profile.get('/mac', async (c: any) => {
  console.log(`[请求] Profile Mode (Mac) - ${c.req.header('User-Agent') || 'Unknown'}`);

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/profile/mac interval=43200 tag=Mac-Profile-v1\n`;
  r += "# app-version = Surge6\n";
  r += "# Mode: Profile (解析节点模式)\n\n";
  r += buildSetting(kSettingMac);

  const configs = await downloadConfigs();
  const proxy: Array<[string, string]> = [];

  for (const [name, config] of configs) {
    for (const [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value]);
    }
  }

  // 构建各段
  let proxyContent = buildProxy(proxy).replace("[Proxy]\n", "");
  r += "[Proxy]\n" + extendedConfig.mergeProxy(proxyContent) + "\n";

  let proxyNames = proxy.map((x) => x[0]);
  let proxyGroupContent = buildProxyGroup(proxyNames).replace("[Proxy Group]\n", "");
  r += "[Proxy Group]\n" + extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n";

  let ruleContent = buildRules().replace("[Rule]\n", "");
  r += "[Rule]\n" + extendedConfig.mergeRule(ruleContent) + "\n";

  let hostContent = buildDNS().replace("[Host]\n", "");
  r += extendedConfig.mergeHost(hostContent);

  return c.text(r);
});

// iOS (Surge 5) Profile Mode
profile.get('/ios', async (c: any) => {
  console.log(`[请求] Profile Mode (iOS) - ${c.req.header('User-Agent') || 'Unknown'}`);

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/profile/ios interval=43200 tag=iOS-Profile-v1\n`;
  r += "# app-version = Surge5\n";
  r += "# Mode: Profile (解析节点模式)\n\n";
  r += buildSetting(kSettingIOS);

  const configs = await downloadConfigs();
  const proxy: Array<[string, string]> = [];

  for (const [name, config] of configs) {
    for (const [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value]);
    }
  }

  // 添加家庭网关代理
  const gatewayHost = getHostFromRequest(c);
  proxy.push(["Home-Gateway", `http, ${gatewayHost}, ${kGatewayHttpPort}`]);

  // 构建各段
  let proxyContent = buildProxy(proxy).replace("[Proxy]\n", "");
  r += "[Proxy]\n" + extendedConfig.mergeProxy(proxyContent) + "\n";

  let proxyNames = proxy.map((x) => x[0]);
  let proxyGroupContent = buildProxyGroup(proxyNames).replace("[Proxy Group]\n", "");
  r += "[Proxy Group]\n" + extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n";

  let ruleContent = buildRules().replace("[Rule]\n", "");
  r += "[Rule]\n" + extendedConfig.mergeRule(ruleContent) + "\n";

  let hostContent = buildDNS().replace("[Host]\n", "");
  r += extendedConfig.mergeHost(hostContent);

  return c.text(r);
});

export default profile;
