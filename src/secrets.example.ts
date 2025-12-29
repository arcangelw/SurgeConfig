/**
 * secrets.example.ts - 敏感配置文件模板
 *
 * 使用方式：
 * 1. 复制本文件为 secrets.ts
 * 2. 填入您的实际配置
 * 3. secrets.ts 已被 .gitignore 忽略，不会提交到版本控制
 */

// ============================================================
// 订阅配置
// ============================================================

/**
 * kSubscriptions - 机场订阅配置
 * 格式: [订阅名称, 订阅 URL]
 * 名称会作为前缀出现在节点名称中
 */
export const kSubscriptions: [string, string][] = [
  // 示例（请替换为您的实际订阅）
  ["Provider-A", "https://example.com/subscribe?token=YOUR_TOKEN"],
  ["Provider-B", "https://other.example.com/api/v1/client/subscribe?token=YOUR_TOKEN"],
];

// ============================================================
// 公司内网配置
// ============================================================

/**
 * kCompanyConfig - 公司内网配置
 * 用于处理企业内网、VPN 等特殊网络环境
 */
export const kCompanyConfig = {
  /** 是否启用公司配置 */
  enabled: true,

  /** 策略组名称 */
  name: "🏢 公司内网",

  /** 公司内网域名 (强制直连或走特定代理) */
  domains: [
    "corp.example.com",
    "internal.example.net",
    "*.company.local",
  ],

  /** 公司内网 IP 段 */
  ips: [
    "10.0.0.0/8",
    "172.16.0.0/12",
  ],

  /** 
   * 跳过代理 (Skip Proxy) 
   * 这些域名将被追加到 [General] skip-proxy 中
   */
  skipProxy: [
    "*.corp.example.com",
    "internal.service.local"
  ],

  /** 策略: "DIRECT" | "REJECT" | 自定义代理名 */
  policy: "DIRECT",
};

// ============================================================
// 扩展配置 (原 config/rules.ts)
// ============================================================

/**
 * kSecretExtendedConfig - 敏感扩展配置
 * 用于在基础配置之上添加额外的配置段（如自定义策略组定义）
 */
export const kSecretExtendedConfig: Record<string, string> = {
  // 示例：
  // Proxy: "MyGroup = select, Policy1, Policy2\n",
};

// ============================================================
// 自定义规则
// ============================================================

/**
 * kSecretCustomRules - 私有自定义规则
 * 这些规则会被添加到 [Rule] 段的最前面（最高优先级）
 */
export const kSecretCustomRules: string[] = [
  // 示例：
  "DOMAIN-SUFFIX,private-service.com,DIRECT",
  "IP-CIDR,192.168.100.0/24,DIRECT,no-resolve",
];
