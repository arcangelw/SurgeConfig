/**
 * config/rule-sets.ts - 规则集定义
 * 
 * 定义引用自外部的规则集列表 (blackmatrix7)
 */

import { RuleSetConfig } from './types';

export const RULE_SETS: Record<string, RuleSetConfig> = {
  Apple: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_All.list"],
    type: "proxy",
    emoji: "🍎",
    optimizeGroup: "apple",
  },
  OpenAI: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/OpenAI/OpenAI.list"],
    type: "proxy",
    emoji: "🤖",
    excludeHKAndTW: true,
    optimizeGroup: "ai",
  },
  TikTok: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/TikTok/TikTok.list"],
    type: "proxy",
    emoji: "🎵",
  },
  Twitter: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Twitter/Twitter.list"],
    type: "proxy",
    emoji: "🐦",
    excludeHKAndTW: true,
    optimizeGroup: "ai",
  },
  Telegram: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Telegram/Telegram.list"],
    type: "proxy",
    emoji: "✈️",
  },
  Disney: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Disney/Disney.list"],
    type: "proxy",
    emoji: "🏰",
  },
  Netflix: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Netflix/Netflix.list"],
    type: "proxy",
    emoji: "🎬",
  },
  Microsoft: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Microsoft/Microsoft.list"],
    type: "proxy",
    emoji: "🪟",
    optimizeGroup: "ai",
  },
  Claude: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Claude/Claude.list"],
    type: "proxy",
    emoji: "🧠",
    excludeHKAndTW: true,
    optimizeGroup: "ai",
  },
  Gemini: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Gemini/Gemini.list"],
    type: "proxy",
    emoji: "💎",
    excludeHKAndTW: true,
    optimizeGroup: "ai",
  },
  Google: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Google/Google.list"],
    type: "proxy",
    emoji: "🔍",
    optimizeGroup: "ai",
  },
  Global: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Global/Global.list"],
    type: "proxy",
    emoji: "🌍",
  },
  Github: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/GitHub/GitHub.list"],
    type: "proxy",
    emoji: "💻",
    optimizeGroup: "ai",
  },
  China: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/China/China_All.list"],
    type: "direct",
    emoji: "🇨🇳",
  },
  ChinaIP: {
    url: ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/ChinaIPs/ChinaIPs.list"],
    type: "direct",
    emoji: "🇨🇳",
  },
};
