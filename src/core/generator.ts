/**
 * generator.ts - 配置文件生成器
 *
 * 负责生成 Surge 配置文件的各个部分：
 * - [General] / [Replica] 等基础设置
 * - [Proxy] 段
 * - [Rule] 段
 * - [Host] 段
 */

import {
  kDNS,
  kRuleSet,
  kRules,
  kCustomRules,
  kLanConfig,
  kLocalLanRules,
  kExtendedConfig,
} from '../config/index';
import { buildCompanyRules, kCompanyConfig } from './grouper';

/**
 * 构建通用配置段（[General] / [Replica] 等）
 * @param setting 形如 { SectionName: { key: value } } 的配置对象
 */
export const buildSetting = (setting: Record<string, Record<string, string>>): string => {
  let result = "";
  Object.keys(setting).forEach((sectionName) => {
    result += `[${sectionName}]\n`;
    const section = setting[sectionName];
    
    // 特殊处理 General 段，合并敏感跳过代理配置
    if (sectionName === "General" && kCompanyConfig.enabled && kCompanyConfig.skipProxy && kCompanyConfig.skipProxy.length > 0) {
      // 深度拷贝以避免修改原配置
      const mergedSection = { ...section };
      const currentSkip = mergedSection["skip-proxy"] || "";
      const extraSkip = kCompanyConfig.skipProxy.join(", ");
      
      if (currentSkip) {
        mergedSection["skip-proxy"] = `${currentSkip}, ${extraSkip}`;
      } else {
        mergedSection["skip-proxy"] = extraSkip;
      }
      
      Object.keys(mergedSection).forEach((key) => {
        result += `${key} = ${mergedSection[key]}\n`;
      });
    } else {
      // 普通段直接生成
      Object.keys(section).forEach((key) => {
        result += `${key} = ${section[key]}\n`;
      });
    }
    result += "\n";
  });
  return result;
};

/**
 * 构建 [Proxy] 段
 * @param proxy 代理节点数组 [名称, 参数字符串]
 */
export const buildProxy = (proxy: Array<[string, string]>): string => {
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

/**
 * 构建 [Rule] 段
 */
export const buildRules = (): string => {
  let result = "[Rule]\n";

  // 0. 公司内网规则（最高优先级）
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
    result += "# 使用远程 Lan.list 规则集\n";
    result += "RULE-SET, https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Lan/Lan.list, 🌐 全球直连\n";
  } else {
    result += "# 使用本地 CIDR 规则\n";
    result += kLocalLanRules.join("\n") + "\n";
  }

  // 3. 业务规则集
  result += "\n# > 业务规则集（来自 blackmatrix7/ios_rule_script）\n";
  for (const [name, value] of Object.entries(kRuleSet)) {
    const groupName = value.emoji ? `${value.emoji} ${name}` : name;

    for (const url of value.url) {
      if (value.type === "direct") {
        result += `RULE-SET, ${url}, 🌐 全球直连\n`;
      }
      if (value.type === "proxy") {
        result += `RULE-SET, ${url}, ${groupName}\n`;
      }
    }
  }

  // 4. 基础规则
  result += "\n# > 基础规则\n";
  result += kRules.join("\n") + "\n";

  result += "\n";
  return result;
};

/**
 * 构建 [Host] 段
 */
export const buildDNS = (): string => {
  let result = "[Host]\n";

  // 1. 公司内网 DNS (Split DNS)
  // 将公司域名指定使用系统 DNS 解析 (解决内网域名无法被公共 DNS 解析的问题)
  if (kCompanyConfig.enabled && kCompanyConfig.domains.length > 0) {
    result += `# > ${kCompanyConfig.name} (Split DNS)\n`;
    for (const domain of kCompanyConfig.domains) {
      const cleanDomain = domain.startsWith("*.") ? domain.slice(2) : domain;
      result += `${cleanDomain} = server:system\n`;
      result += `*.${cleanDomain} = server:system\n`;
    }
  }

  // 2. 自定义 Host
  if (kDNS.length > 0) {
    result += "# > 自定义 Host\n";
    for (const [domain, ip] of kDNS) {
      result += `${domain} = ${ip}\n`;
    }
  }

  return result;
};

/**
 * 扩展配置工具函数
 */
export const extendedConfig = {
  get(section: string): string {
    return kExtendedConfig[section]?.trim() || "";
  },

  merge(section: string, mainContent: string, comment?: string): string {
    const extended = this.get(section);
    if (!extended) {
      return mainContent;
    }

    let result = mainContent;
    result += comment
      ? `\n\n# ========== ${comment} ==========\n`
      : "\n\n# ========== 扩展配置 ==========\n";
    result += extended;
    return result;
  },

  mergeProxy(mainContent: string): string {
    return this.merge("Proxy", mainContent);
  },

  mergeProxyGroup(mainContent: string): string {
    return this.merge("Proxy Group", mainContent, "扩展配置");
  },

  mergeRule(mainContent: string): string {
    return this.merge("Rule", mainContent, "扩展规则");
  },

  mergeHost(mainContent: string): string {
    return this.merge("Host", mainContent, "扩展 Host");
  },
};

/**
 * 从请求头中提取当前访问的主机名（不含端口）
 */
export const getHostFromRequest = (c: any): string => {
  const host = c.req.header("Host") || "";
  return host.split(":")[0] || host;
};
