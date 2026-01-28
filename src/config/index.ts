/**
 * config/index.ts - 配置统一导出
 * 
 * 聚合所有配置模块，提供统一的导入入口
 */

export * from './types';
export * from './constants';
export * from './general';
export * from './classification'; // Replaces regions
export * from './rule-sets';      // Replaces rulesets
export * from './rules';          // Preserved

// 从 secrets.ts 导出用户配置
import { 
  kSubscriptions, 
  kCompanyConfig, 
  kCustomRules,
  kCustomGroups,
  kCustomHosts
} from '../secrets';

export {
  kSubscriptions,
  kCompanyConfig,
  kCustomRules,
  kCustomGroups,
  kCustomHosts
};

// 兼容性导出 (Refactoring Shims) - 暂时保留以防未修改的引用报错
import { getGeneralConfig } from './general';
import { Platform } from './types';
import { CLASSIFICATION_STRATEGY } from './classification';
import { RULE_SETS } from './rule-sets';
import { PORTS } from './constants';

export const kSettingMac = getGeneralConfig(Platform.MAC);
export const kSettingIOS = getGeneralConfig(Platform.IOS);
export const kRegionConfig = CLASSIFICATION_STRATEGY;
export const kRuleSet = RULE_SETS;
export const kGatewayHttpPort = PORTS.GATEWAY_HTTP;
export const kGatewaySocksPort = PORTS.GATEWAY_SOCKS;

export const kSurgeConfig = kSubscriptions;
export const kDNS = kCustomHosts;
export const kSecretCustomRules = kCustomRules;
export const kExtendedConfig = kCustomGroups;
