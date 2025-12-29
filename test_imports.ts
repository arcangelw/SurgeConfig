import { downloadConfigs } from './src/core/downloader';
import { buildStandardGroups, kRegionConfig } from './src/core/grouper';
import { buildSetting, buildRules } from './src/core/generator';

console.log('=== Module Import Test ===');
console.log('kRegionConfig keys:', Object.keys(kRegionConfig));
console.log('buildStandardGroups:', typeof buildStandardGroups);
console.log('buildSetting:', typeof buildSetting);
console.log('buildRules:', typeof buildRules);
console.log('downloadConfigs:', typeof downloadConfigs);
console.log('=== All imports OK ===');
