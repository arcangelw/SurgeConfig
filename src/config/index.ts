/**
 * config/index.ts - 配置统一导出
 * 
 * 聚合所有配置模块，提供统一的导入入口
 */

// 地区配置
export { kRegionConfig } from './regions';
export type { RegionConfig } from './regions';

// 规则集配置
export { kRuleSet } from './rulesets';
export type { RuleSetConfig } from './rulesets';

// 基础设置
export {
  kSettingMac,
  kSettingIOS,
  kGatewayHttpPort,
  kGatewaySocksPort,
} from './settings';

// 规则配置
export {
  kLanConfig,
  kLocalLanRules,
  kRules,
} from './rules';

// DNS 配置
export { kDNS } from './dns';

// 敏感配置（从 secrets.ts 导入）
import { kSubscriptions, kCompanyConfig, kSecretCustomRules, kSecretExtendedConfig } from '../secrets';

/** 订阅配置 */
export const kSurgeConfig = kSubscriptions;

/** 公司配置 */
export { kCompanyConfig };

/** 自定义规则 */
export const kCustomRules = kSecretCustomRules;

/** 扩展配置（敏感） */
export const kExtendedConfig = kSecretExtendedConfig;
