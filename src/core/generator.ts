/**
 * core/generator.ts - 配置文件生成器 (Renderer)
 *
 * 负责将各个配置块组装成最终的 Surge 配置文件字符串
 */

import {
  kCustomHosts,
  kRuleSet,
  kRules,
  kCustomRules,
  kLanConfig,
  kLocalLanRules,
  kCustomGroups,
  kCompanyConfig,
} from '../config/index';

// 引入 grouper 用于生成公司规则 (虽然 grouper 主要负责 ProxyGroup，但 Rules 也有部分逻辑)
import { buildCompanyRules } from './grouper';

/**
 * 扩展配置工具
 */
const extendedConfig = {
  get(section: string): string {
    return kCustomGroups[section]?.trim() || "";
  },
  merge(section: string, mainContent: string, comment?: string): string {
    const extended = this.get(section);
    if (!extended) return mainContent;
    
    let result = mainContent;
    result += comment ? `\n\n# ========== ${comment} ==========\n` : "\n\n# ========== 扩展配置 ==========\n";
    result += extended;
    return result;
  },
  // Helpers
  mergeProxy(c: string) { return this.merge("Proxy", c); },
  mergeProxyGroup(c: string) { return this.merge("Proxy Group", c, "扩展配置"); },
  mergeRule(c: string) { return this.merge("Rule", c, "扩展规则"); },
  mergeHost(c: string) { return this.merge("Host", c, "扩展 Host"); },
};

// ============================================================
// Internal Builders
// ============================================================

const buildSetting = (setting: Record<string, Record<string, string>>): string => {
  let result = "";
  Object.keys(setting).forEach((sectionName) => {
    result += `[${sectionName}]\n`;
    const section = setting[sectionName];
    
    // 合并公司内网 Skip Proxy
    if (sectionName === "General" && kCompanyConfig.enabled && kCompanyConfig.skipProxy?.length > 0) {
      const mergedSection = { ...section };
      const currentSkip = mergedSection["skip-proxy"] || "";
      const extraSkip = kCompanyConfig.skipProxy.join(", ");
      mergedSection["skip-proxy"] = currentSkip ? `${currentSkip}, ${extraSkip}` : extraSkip;
      
      Object.entries(mergedSection).forEach(([k, v]) => result += `${k} = ${v}\n`);
    } else {
      Object.entries(section).forEach(([k, v]) => result += `${k} = ${v}\n`);
    }
    result += "\n";
  });
  return result;
};

const buildProxy = (proxy: Array<[string, string]>): string => {
  let result = "[Proxy]\n";
  result += "# 统一的直连策略\n";
  result += "🌐 全球直连 = direct\n";

  if (proxy.length > 0) {
    result += `# 共 ${proxy.length} 个代理节点\n`;
    result += proxy.map((x) => `${x[0]}=${x[1]}`).join("\n");
  }
  result += "\n";
  return result;
};

const buildRules = (): string => {
  let result = "[Rule]\n";

  // 0. 公司内网规则
  if (kCompanyConfig.enabled) {
    const companyRules = buildCompanyRules();
    if (companyRules.length > 0) {
      result += `# > ${kCompanyConfig.name}（最高优先级）\n`;
      result += companyRules.join("\n") + "\n\n";
    }
  }

  // 1. 自定义业务规则
  if (kCustomRules.length > 0) {
    result += "# > 自定义业务规则\n";
    result += kCustomRules.join("\n") + "\n\n";
  }

  // 2. 局域网规则
  result += "# > 局域网规则\n";
  if (kLanConfig.useRemoteLanRuleSet) {
    result += "RULE-SET, https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Lan/Lan.list, 🌐 全球直连\n";
  } else {
    result += kLocalLanRules.join("\n") + "\n";
  }

  // 3. 业务规则集
  result += "\n# > 业务规则集\n";
  for (const [name, value] of Object.entries(kRuleSet)) {
    const groupName = value.emoji ? `${value.emoji} ${name}` : name;
    for (const url of value.url) {
      if (value.type === "direct") {
        result += `RULE-SET, ${url}, 🌐 全球直连\n`;
      } else {
        result += `RULE-SET, ${url}, ${groupName}\n`;
      }
    }
  }

  // 4. 基础规则
  result += "\n# > 基础规则\n";
  result += kRules.join("\n") + "\n\n";

  return result;
};

const buildDNS = (): string => {
  let result = "[Host]\n";

  // 1. Split DNS
  if (kCompanyConfig.enabled && kCompanyConfig.domains.length > 0) {
    result += `# > ${kCompanyConfig.name} (Split DNS)\n`;
    for (const domain of kCompanyConfig.domains) {
      const cleanDomain = domain.startsWith("*.") ? domain.slice(2) : domain;
      result += `${cleanDomain} = server:system\n`;
      result += `*.${cleanDomain} = server:system\n`;
    }
  }

  // 2. Custom Hosts
  if (kCustomHosts.length > 0) {
    result += "# > 自定义 Host\n";
    for (const [domain, ip] of kCustomHosts) {
      result += `${domain} = ${ip}\n`;
    }
  }

  return result;
};

// ============================================================
// Public Compiler
// ============================================================

/**
 * 编译 Surge 完整配置
 * @param header 头部信息 (# Managed-Config ...)
 * @param generalConfig General/Replica 配置对象
 * @param proxies 代理节点列表
 * @param proxyGroupContent 策略组内容字符串
 */
export const compileSurgeConfig = (
  header: string,
  generalConfig: Record<string, Record<string, string>>,
  proxies: Array<[string, string]>,
  proxyGroupContent: string
): string => {
  let result = header + "\n";
  
  // 1. General / Replica
  result += buildSetting(generalConfig);

  // 2. Proxy
  let proxyContent = buildProxy(proxies).replace("[Proxy]\n", "");
  result += "[Proxy]\n" + extendedConfig.mergeProxy(proxyContent) + "\n\n";

  // 3. Proxy Group
  // 注意：proxyGroupContent 不包含 [Proxy Group] 头，由 compile 函数添加
  // 但 extendedConfig.mergeProxyGroup 这里为了逻辑一致性，我们手动拼接
  result += "[Proxy Group]\n" + extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n\n";

  // 4. Rule
  let ruleContent = buildRules().replace("[Rule]\n", "");
  result += "[Rule]\n" + extendedConfig.mergeRule(ruleContent) + "\n\n";

  // 5. Host
  let hostContent = buildDNS().replace("[Host]\n", "");
  result += "[Host]\n" + extendedConfig.mergeHost(hostContent);

  return result;
};

/**
 * Helper: 从请求获取 Host
 */
export const getHostFromRequest = (c: any): string => {
  const host = c.req.header("Host") || "";
  return host.split(":")[0] || host;
};
