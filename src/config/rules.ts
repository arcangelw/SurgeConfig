/**
 * config/rules.ts - 规则配置
 * 
 * 定义局域网规则、基础规则等
 */

/**
 * 局域网配置
 */
export const kLanConfig = {
  /** 是否使用远程 Lan.list 规则集 */
  useRemoteLanRuleSet: true,
};

/**
 * 本地内置的局域网直连规则
 * 仅在 useRemoteLanRuleSet=false 时生效
 */
export const kLocalLanRules: string[] = [
  "IP-CIDR,192.168.0.0/16,🌐 全球直连",
  "IP-CIDR,10.0.0.0/8,🌐 全球直连",
  "IP-CIDR,172.16.0.0/12,🌐 全球直连",
  "IP-CIDR,127.0.0.0/8,🌐 全球直连",
  "IP-CIDR,100.64.0.0/10,🌐 全球直连",
  "IP-CIDR,224.0.0.0/4,🌐 全球直连",
];

/**
 * 基础规则（兜底）
 */
export const kRules: string[] = [
  "FINAL,⚡ Final,dns-failed",
];
