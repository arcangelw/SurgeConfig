/**
 * secrets.example.ts - 用户配置文件模板
 *
 * 使用方式：
 * 1. 复制本文件为 secrets.ts
 * 2. 填入您的实际配置
 * 3. secrets.ts 已被 .gitignore 忽略，不会提交到版本控制
 */

// ============================================================
// 1. 订阅源 (Subscriptions)
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
// 2. 公司/内网配置 (Company & Split DNS)
// ============================================================

/**
 * kCompanyConfig - 公司内网配置
 * 用于处理企业内网、VPN 等特殊网络环境
 * 
 * 功能：
 * 1. domains 中的域名会强制走 system DNS (Split DNS)
 * 2. 自动生成对应的分流规则
 */
export const kCompanyConfig = {
  /** 是否启用公司配置 */
  enabled: true,

  /** 内网策略组名称 */
  name: "🏢 公司内网",

  /** 公司内网域名 (强制 system DNS 解析 + 走 policy 代理) */
  domains: [
    "corp.example.com",
    "internal.example.net",
    "*.company.local",
  ] as string[],

  /** 公司内网 IP 段 (走 policy 代理) */
  ips: [
    "10.0.0.0/8",
    "172.16.0.0/12",
  ] as string[],

  /** 
   * 跳过代理 (Skip Proxy) 
   * 这些域名将被追加到 [General] skip-proxy 中，绕过 Surge 核心
   */
  skipProxy: [
    "*.corp.example.com",
    "internal.service.local"
  ] as string[],

  /** 策略: "DIRECT" | "REJECT" | 自定义代理名 */
  policy: "DIRECT",
};

// ============================================================
// 3. 自定义 Hosts
// ============================================================

/**
 * kCustomHosts - 自定义域名解析 [Host]
 */
export const kCustomHosts: [string, string][] = [
  // 示例：
  // ["example.com", "1.2.3.4"],
];

// ============================================================
// 4. 自定义规则 (Rules)
// ============================================================

/**
 * kCustomRules - 自定义分流规则 [Rule]
 * 优先级最高，位于文件顶部
 */
export const kCustomRules: string[] = [
  // 示例：
  "DOMAIN-SUFFIX,private-service.com,DIRECT",
  "IP-CIDR,192.168.100.0/24,DIRECT,no-resolve",
];

// ============================================================
// 5. 自定义策略组 (Groups)
// ============================================================

/**
 * kCustomGroups - 自定义策略组定义 [Proxy Group]
 * 可以定义新的 Select/URL-Test 组
 */
export const kCustomGroups: Record<string, string> = {
  // 示例：
  // "MyGroup": "MyGroup = select, Policy1, Policy2\n",
};
