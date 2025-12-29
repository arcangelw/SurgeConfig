/**
 * config/regions.ts - 地区配置
 * 
 * 定义各个地区的识别规则和策略组生成规则
 */

/**
 * 地区配置类型定义
 */
export interface RegionConfig {
  /** 地区显示名称 */
  name: string;
  /** Emoji 标识 */
  emoji: string;
  /** 节点名称匹配规则 */
  matchPatterns: string[];
  /** 正则过滤器（用于 policy-regex-filter） */
  regexFilter: string;
  /** 是否生成手动策略组 */
  hasManualGroup?: boolean;
  /** 是否只生成手动策略组 */
  onlyManual?: boolean;
  /** 是否加入 Vibe-Coding 组合策略组 */
  includeInVibeGroup?: boolean;
  /** 是否在 excludeHKAndTW 时排除此地区 */
  excludeOnHKAndTW?: boolean;
  /** 是否为核心地区 */
  isCore?: boolean;
  /** 显示顺序（数字越小越靠前） */
  order: number;
}

/**
 * 地区配置
 * - 核心地区（智能 + 手动策略组）
 * - 其他地区（合并为单一手动选择组）
 */
export const kRegionConfig: Record<string, RegionConfig> = {
  // ========== 核心地区 ==========
  us: {
    name: "美国",
    emoji: "🇺🇲",
    matchPatterns: ["美国", "united states", "unitedstates", "US", "America"],
    regexFilter: "(🇺🇸|🇺🇲)|(美)|(States)|(US)|(America)",
    hasManualGroup: true,
    includeInVibeGroup: true,
    isCore: true,
    order: 1,
  },
  sg: {
    name: "新加坡",
    emoji: "🇸🇬",
    matchPatterns: ["新加坡", "singapore", "SG", "狮城"],
    regexFilter: "(🇸🇬)|(新加坡)|(狮城)|(Singapore)|(SG)",
    hasManualGroup: true,
    includeInVibeGroup: true,
    isCore: true,
    order: 2,
  },
  jp: {
    name: "日本",
    emoji: "🇯🇵",
    matchPatterns: ["日本", "japan", "JP", "Tokyo", "东京"],
    regexFilter: "(🇯🇵)|(日)|(Japan)|(JP)|(Tokyo)",
    hasManualGroup: true,
    isCore: true,
    order: 3,
  },
  hk: {
    name: "香港",
    emoji: "🇭🇰",
    matchPatterns: ["香港", "hong", "HK"],
    regexFilter: "(🇭🇰)|(港)|(Hong)|(HK)",
    hasManualGroup: true,
    excludeOnHKAndTW: true,
    isCore: true,
    order: 4,
  },
  tw: {
    name: "台湾",
    emoji: "🇨🇳", // 强制使用中国旗帜
    matchPatterns: ["台湾", "台灣", "taiwan", "TW"],
    regexFilter: "(台)|(Tai)|(TW)",
    hasManualGroup: true,
    excludeOnHKAndTW: true,
    isCore: true,
    order: 5,
  },
  // ========== 其他地区 ==========
  others: {
    name: "其他地区",
    emoji: "🌍",
    matchPatterns: [
      // 欧洲
      "德国", "Germany", "DE", "英国", "UK", "Britain", "法国", "France", "FR",
      "荷兰", "Netherlands", "NL", "意大利", "Italy", "IT", "西班牙", "Spain", "ES",
      "土耳其", "Turkey", "TR", "乌克兰", "Ukraine", "UA", "匈牙利", "Hungary", "HU",
      "摩尔多瓦", "Moldova", "MD", "俄罗斯", "Russia", "RU",
      // 亚太
      "韩国", "Korea", "KR", "印度", "India", "IN", "越南", "Vietnam", "VN",
      "泰国", "Thailand", "TH", "印尼", "Indonesia", "ID", "马来西亚", "Malaysia", "MY",
      "菲律宾", "Philippines", "PH", "澳大利亚", "Australia", "AU", "新西兰", "Zealand", "NZ",
      // 美洲
      "加拿大", "Canada", "CA", "巴西", "Brazil", "BR", "阿根廷", "Argentina", "AR",
      "智利", "Chile", "CL", "墨西哥", "Mexico", "MX",
      // 中东非
      "以色列", "Israel", "IL", "阿联酋", "UAE", "AE", "埃及", "Egypt", "EG",
      "尼日利亚", "Nigeria", "NG", "巴基斯坦", "Pakistan", "PK", "南非", "Africa", "ZA",
    ],
    regexFilter: "(🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇮🇹|🇪🇸|🇹🇷|🇺🇦|🇭🇺|🇲🇩|🇷🇺|🇰🇷|🇮🇳|🇻🇳|🇹🇭|🇮🇩|🇲🇾|🇵🇭|🇦🇺|🇳🇿|🇨🇦|🇧🇷|🇦🇷|🇨🇱|🇲🇽|🇮🇱|🇦🇪|🇪🇬|🇳🇬|🇵🇰|🇿🇦)|(德国|英国|法国|荷兰|意大利|西班牙|土耳其|乌克兰|匈牙利|摩尔多瓦|俄罗斯|韩国|印度|越南|泰国|印尼|马来西亚|菲律宾|澳大利亚|澳洲|新西兰|加拿大|巴西|阿根廷|智利|墨西哥|以色列|阿联酋|埃及|尼日利亚|巴基斯坦|南非)",
    hasManualGroup: false,
    onlyManual: true,
    isCore: false,
    order: 99,
  },
};
