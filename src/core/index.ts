/**
 * core/index.ts - 核心模块统一导出
 */

// 下载模块
export {
  downloadConfig,
  parseConfig,
  downloadConfigs,
  getSubscriptionUrls,
} from './downloader';

// 策略组构建模块
export {
  bucketProxyByRegion,
  getSortedRegions,
  getCoreRegions,
  getOtherRegions,
  buildStandardGroups,
  buildCompanyRules,
  buildVibeCodingCandidates,
  kRegionConfig,
  kRuleSet,
  kCompanyConfig,
} from './grouper';

// 配置生成模块
export {
  buildSetting,
  buildProxy,
  buildRules,
  buildDNS,
  extendedConfig,
  getHostFromRequest,
} from './generator';
