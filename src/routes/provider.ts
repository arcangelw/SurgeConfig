/**
 * routes/provider.ts - Provider Mode 路由
 *
 * Provider Mode（原外部节点模式）：
 * - 使用 policy-path 引用外部订阅源
 * - 支持 smart 策略组自动选择最优节点
 * - 节点自动从订阅更新
 *
 * 端点：
 * - /provider/mac - Mac (Surge 6)
 * - /provider/ios - iOS (Surge 5)
 */

import { Hono } from 'hono';
import { env } from 'bun';
import {
  buildSetting,
  buildRules,
  buildDNS,
  extendedConfig,
  getHostFromRequest,
} from '../core/generator';
import {
  getSortedRegions,
  buildStandardGroups,
  kRuleSet,
} from '../core/grouper';
import { kSettingMac, kSettingIOS, kSurgeConfig, kGatewayHttpPort } from '../config/index';

const provider = new Hono();

/**
 * 构建外部节点模式的策略组
 */
const buildExternalProxyGroup = (): string => {
  let result = "[Proxy Group]\n";

  if (kSurgeConfig.length === 0) {
    result += "⚡ Final = select, 🌐 全球直连\n\n";
    return result;
  }

  result += "# > 外部节点\n";
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

    // onlyManual 模式
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

    // 正常模式
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

  // 4. 业务分流策略组
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
  result += `⚡ Final = select, ${finalGroups.join(", ")}\n\n`;

  return result;
};

// Mac (Surge 6) Provider Mode
provider.get('/mac', async (c: any) => {
  console.log(`[请求] Provider Mode (Mac) - ${c.req.header('User-Agent') || 'Unknown'}`);

  if (kSurgeConfig.length === 0) {
    return c.text("# 错误：未配置订阅，请在 src/secrets.ts 中配置 kSubscriptions", 400);
  }

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/provider/mac interval=43200 tag=Mac-Provider-v1\n`;
  r += "# app-version = Surge6\n";
  r += "# Mode: Provider (外部节点模式)\n\n";
  r += buildSetting(kSettingMac);

  r += "[Proxy]\n";
  r += extendedConfig.mergeProxy("🌐 全球直连 = direct") + "\n\n";

  let proxyGroupContent = buildExternalProxyGroup().replace("[Proxy Group]\n", "");
  r += "[Proxy Group]\n" + extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n";

  let ruleContent = buildRules().replace("[Rule]\n", "");
  r += "[Rule]\n" + extendedConfig.mergeRule(ruleContent) + "\n";

  let hostContent = buildDNS().replace("[Host]\n", "");
  r += "[Host]\n" + extendedConfig.mergeHost(hostContent);

  return c.text(r);
});

// iOS (Surge 5) Provider Mode
provider.get('/ios', async (c: any) => {
  console.log(`[请求] Provider Mode (iOS) - ${c.req.header('User-Agent') || 'Unknown'}`);

  if (kSurgeConfig.length === 0) {
    return c.text("# 错误：未配置订阅，请在 src/secrets.ts 中配置 kSubscriptions", 400);
  }

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/provider/ios interval=43200 tag=iOS-Provider-v1\n`;
  r += "# app-version = Surge5\n";
  r += "# Mode: Provider (外部节点模式)\n\n";
  r += buildSetting(kSettingIOS);

  const gatewayHost = getHostFromRequest(c);
  let proxyContent = `🌐 全球直连 = direct\nHome-Gateway = http, ${gatewayHost}, ${kGatewayHttpPort}`;
  r += "[Proxy]\n" + extendedConfig.mergeProxy(proxyContent) + "\n\n";

  let proxyGroupContent = buildExternalProxyGroup().replace("[Proxy Group]\n", "");
  r += "[Proxy Group]\n" + extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n";

  let ruleContent = buildRules().replace("[Rule]\n", "");
  r += "[Rule]\n" + extendedConfig.mergeRule(ruleContent) + "\n";

  let hostContent = buildDNS().replace("[Host]\n", "");
  r += "[Host]\n" + extendedConfig.mergeHost(hostContent);

  return c.text(r);
});

export default provider;
