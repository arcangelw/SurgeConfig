/**
 * kSurgeConfig
 * - 统一的订阅配置，同时用于解析节点模式和外部节点模式
 * - 每一项为 [配置名称, 订阅 URL]，名称会作为前缀出现在最终的 Proxy 名称里（如 NAME-节点名）
 * - 解析节点模式：使用所有配置，下载并解析节点
 * - 外部节点模式：使用第一个配置，通过 policy-path 自动更新
 * - 示例：["MyProvider", "https://example.com/surge.conf"]
 * 
 * 使用方式：
 * - 解析节点模式（/surge.conf, /surge_ios.conf）：使用所有配置的节点
 * - 外部节点模式（/surge_both.conf, /surge_ios_both.conf）：使用第一个配置作为外部节点源
 */
const kSurgeConfig: [string, string][] = [
    // ["NAME", "CONFIG_URL"],
    // 示例配置（请替换为真实的订阅 URL）
    // ["MyProvider", "https://example.com/surge.conf"],
]

/**
 * kRuleSet
 * - 定义各个逻辑业务分类对应的 RULE-SET 列表（全部来自 blackmatrix7 仓库）。
 * - type:
 *   - "proxy": 命中这些规则的流量走对应策略组（如 OpenAI、Netflix 等）。
 *   - "direct": 命中后直连，用于 China / ChinaIP 等内网/本地流量。
 * - emoji: 业务策略组的 emoji 标识（可选，用于美化策略组名称）
 * - excludeHKAndTW:
 *   - 为 true 时，在对应策略组中会自动排除名称包含 HK/香港/TW/中转/Bandwidth 的节点。
 */
const kRuleSet: {
    [name: string]: {
        url: string[]
        type: "proxy" | "direct"
        emoji?: string
        excludeHKAndTW?: boolean
    }
} = {
    "Apple": {
        "url": [
            "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple.list",
            //            "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_Domain.list",
        ],
        "type": "proxy",
        "emoji": "🍎"
    },
    "OpenAI": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/OpenAI/OpenAI.list"],
        "type": "proxy",
        "emoji": "🤖",
        "excludeHKAndTW": true
    },
    "TikTok": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/TikTok/TikTok.list"],
        "type": "proxy",
        "emoji": "🎵"
    },
    "Twitter": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Twitter/Twitter.list"],
        "type": "proxy",
        "emoji": "🐦",
        "excludeHKAndTW": true,
    },
    "Telegram": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Telegram/Telegram.list"],
        "type": "proxy",
        "emoji": "✈️"
    },
    "Disney": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Disney/Disney.list"],
        "type": "proxy",
        "emoji": "🏰"
    },
    "Netflix": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Netflix/Netflix.list"],
        "type": "proxy",
        "emoji": "🎬"
    },
    "Microsoft": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Microsoft/Microsoft.list"],
        "type": "proxy",
        "emoji": "🪟"
    },
    "Claude": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Claude/Claude.list"],
        "type": "proxy",
        "emoji": "🧠",
        "excludeHKAndTW": true
    },
    "Gemini": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Gemini/Gemini.list"],
        "type": "proxy",
        "emoji": "💎",
        "excludeHKAndTW": true
    },
    "Google": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Google/Google.list"],
        "type": "proxy",
        "emoji": "🔍"
    },
    "Global": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Global/Global.list"],
        "type": "proxy",
        "emoji": "🌍"
    },
    "Github": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/GitHub/GitHub.list"],
        "type": "proxy",
        "emoji": "💻"
    },
    "China": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/China/China_All.list"],
        "type": "direct",
        "emoji": "🇨🇳"
    },
    "ChinaIP": {
        "url": ["https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/ChinaIPs/ChinaIPs.list"],
        "type": "direct",
        "emoji": "🇨🇳"
    }
}

/**
 * 局域网直连相关配置
 * - useRemoteLanRuleSet:
 *   - true: 使用 blackmatrix7 提供的 Lan.list 作为局域网规则（推荐做法之一）。
 *   - false: 使用本地内置的 CIDR 局域网直连规则。
 * - 这两种方式是互斥的，以避免规则重复。
 */
const kLanConfig = {
    useRemoteLanRuleSet: true,
}

/**
 * 本地内置的局域网直连规则（仅在 useRemoteLanRuleSet=false 时生效）
 */
const kLocalLanRules: string[] = [
    "IP-CIDR,192.168.0.0/16,🌐 全球直连",
    "IP-CIDR,10.0.0.0/8,🌐 全球直连",
    "IP-CIDR,172.16.0.0/12,🌐 全球直连",
    "IP-CIDR,127.0.0.0/8,🌐 全球直连",
    "IP-CIDR,100.64.0.0/10,🌐 全球直连",
    "IP-CIDR,224.0.0.0/4,🌐 全球直连",
]

/**
 * kRules
 * - 额外的基础规则，直接拼接到 [Rule] 段的末尾。
 * - 这里主要放一些保底规则（例如 FINAL），与局域网直连无关。
 */
const kRules: string[] = [
    "FINAL,⚡ Final,dns-failed",
]

// 网关代理端口配置
// - http-listen: HTTP 代理端口（Mac 默认 6152，iOS 默认 8888）
// - socks5-listen: SOCKS5 代理端口（Mac 默认 6153，iOS 默认 8889）
const kGatewayHttpPort = 6152
const kGatewaySocksPort = 6153

/**
 * kRegionConfig
 * - 地区配置：定义各个地区的识别规则和策略组生成规则
 * - 通过配置即可扩展新地区，无需修改代码
 * - key: 地区标识（用于内部匹配和分桶）
 * - value: 地区配置对象
 */
const kRegionConfig: Record<string, {
  // 地区显示名称（用于策略组名称）
  name: string
  // Emoji 标识
  emoji: string
  // 节点名称匹配规则（用于解析节点模式）
  matchPatterns: string[]
  // 正则过滤器（用于外部节点模式的 policy-regex-filter）
  regexFilter: string
  // 是否生成手动策略组（select 类型）
  hasManualGroup?: boolean
  // 是否在 excludeHKAndTW 时排除此地区
  excludeOnHKAndTW?: boolean
  // 显示顺序（数字越小越靠前）
  order: number
}> = {
  hk: {
    name: "香港",
    emoji: "🇭🇰",
    matchPatterns: ["香港", "hong", "HK"],
    regexFilter: "(🇭🇰)|(港)|(Hong)|(HK)",
    excludeOnHKAndTW: true,
    order: 1
  },
  tw: {
    name: "台湾",
    emoji: "🇨🇳",
    matchPatterns: ["台湾", "台灣", "taiwan", "TW"],
    regexFilter: "(🇨🇳)|(台)|(Tai)|(TW)",
    excludeOnHKAndTW: true,
    order: 2
  },
  us: {
    name: "美国",
    emoji: "🇺🇲",
    matchPatterns: ["美国", "united states", "unitedstates", "US"],
    regexFilter: "(🇺🇸)|(美)|(States)|(US)",
    hasManualGroup: true,
    order: 3
  },
  jp: {
    name: "日本",
    emoji: "🇯🇵",
    matchPatterns: ["日本", "japan", "JP"],
    regexFilter: "(🇯🇵)|(日)|(Japan)|(JP)",
    order: 4
  },
  sg: {
    name: "新加坡",
    emoji: "🇸🇬",
    matchPatterns: ["新加坡", "singapore", "SG"],
    regexFilter: "(🇸🇬)|(新)|(Singapore)|(SG)",
    hasManualGroup: true,
    order: 5
  }
}



// Mac (Surge 6) 配置，作为默认桌面端配置
// 如需针对桌面环境（网关 / 开发机）调整行为，请优先改这里。
const kSettingMac: Record<string, Record<string, string>> = {
    "General": {
        // 代理监听端口（使用网关端口配置）
        "http-listen": `0.0.0.0:${kGatewayHttpPort}`,
        "socks5-listen": `0.0.0.0:${kGatewaySocksPort}`,
        
        // external-controller-access: 外部控制器访问配置（用于 Surge API / 远程控制）
        // 格式: "password@ip:port"，例如: "your_password@0.0.0.0:6170"
        // 如需启用，取消注释并修改密码
        // "external-controller-access": "your_password_here@0.0.0.0:6170",
        
        // 网络测试配置
        "internet-test-url": "http://www.gstatic.com/generate_204",
        "proxy-test-url": "http://www.gstatic.com/generate_204",
        "test-timeout": "5",
        
        // IPv6 配置（默认关闭，如需启用可改为 "true"）
        "ipv6": "false",
        "ipv6-vif": "disabled",
        
        // All Hybrid 网络并发（Surge 6 新特性）
        // - 同时使用 Wi-Fi 和蜂窝数据网络，提升网络稳定性和连接速度
        // - 优点：在 Wi-Fi 信号较弱时改善体验，减少连接中断
        // - 注意：会增加蜂窝数据流量消耗，建议在拥有不限量数据流量套餐时开启
        // - Mac 设备：如果只有 Wi-Fi 或以太网，此功能效果有限
        // - iOS 设备：建议开启，可显著提升网络体验
        "all-hybrid": "true",
        
        // 以下为 Surge 6 相关的其他可选配置，如需使用网关模式 / IPv6，可按需取消注释并调整
        // "gateway-mode": "true",
        // "ipv6-ra-override": "true",
        
        // 日志和错误页面
        "loglevel": "notify",
        "show-error-page-for-reject": "true",
        
        // DNS 配置（推荐配置）
        "dns-server": "8.8.8.8, 114.114.114.114, 119.28.28.28, system",
        // "encrypted-dns-server": "https://223.5.5.5/dns-query", // 加密 DNS（可选）
        "hijack-dns": "8.8.8.8:53, 8.8.4.4:53", // 劫持 DNS 查询
        "read-etc-hosts": "true", // 从 /etc/hosts 读取 DNS 记录
        "exclude-simple-hostnames": "true",
        
        // GeoIP 数据库（推荐使用国内源）
        "geoip-maxmind-url": "https://github.com/Hackl0us/GeoIP2-CN/raw/release/Country.mmdb",
        "disable-geoip-db-auto-update": "false",
        
        // 跳过代理配置
        "skip-proxy": "127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com",
        
        // Always Real IP（游戏主机直连优化）
        "always-real-ip": "*.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.battlenet.com.cn, *.battlenet.com, *.blzstatic.cn, *.battle.net",
        
        // 其他配置
        "use-default-policy-if-wifi-not-primary": "false",
        "allow-wifi-access": "true",
        "enhanced-mode-by-rule": "false",
        "use-local-host-item-for-proxy": "false",
        
        // Surge VIF 配置（可选，用于网关模式）
        // "tun-excluded-routes": "192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12",
        // "tun-included-routes": "192.168.1.12/32",
        
        // VPN 客户端协同配置（可选）
        // 
        // === FortiClient VPN 配置示例 ===
        // FortiClient 通常创建虚拟网络接口（如 utun0, utun1, fgt0 等）
        // 1. 查看 FortiClient 创建的接口：在终端运行 `ifconfig | grep -E "utun|fgt"`
        // 2. 将接口添加到 skip-proxy，例如：
        //    "skip-proxy": "127.0.0.1, 192.168.0.0/16, utun0, utun1, fgt0, ..."
        // 3. 或者在 kCustomRules 中添加规则，让 FortiClient VPN 流量直连：
        //    "IP-CIDR,10.0.0.0/8,🌐 全球直连"  // FortiClient 内网段
        //    "IP-CIDR,172.16.0.0/12,🌐 全球直连"  // FortiClient 内网段
        //
        // === 通用 VPN 客户端配置 ===
        // 方式 1：VPN 客户端作为 Surge 的上游代理
        // 在 [Proxy] 段中添加 VPN 客户端作为代理节点，例如：
        // "VPN-Client = http, 127.0.0.1, 8080"  // 假设 VPN 客户端提供 HTTP 代理
        // 然后在规则中使用该代理节点
        //
        // 方式 2：Surge 作为 VPN 客户端的代理
        // 在 VPN 客户端中配置使用 Surge 的代理：
        // - HTTP 代理：127.0.0.1:6152（Mac）或 127.0.0.1:8888（iOS）
        // - SOCKS5 代理：127.0.0.1:6153（Mac）或 127.0.0.1:8889（iOS）
        //
        // 方式 3：排除 VPN 接口（如果 VPN 客户端创建了虚拟网络接口）
        // 在 skip-proxy 中添加 VPN 接口名称，例如：utun0, utun1
        // 或者在 kExtendedConfig 中添加规则，让 VPN 流量直连
    },
    "Replica": {
        "hide-apple-request": "true",
        "hide-crashlytics-request": "true",
        "hide-udp": "false",
        "keyword-filter-type": "false",
    },
}

// iOS (Surge 5) 配置，先与 Mac 保持一致，后续可按需微调
// 注意：Surge 5 不支持 all-hybrid（Surge 6 新特性），已自动排除
const kSettingIOS: Record<string, Record<string, string>> = {
    "General": {
        // 代理监听端口（使用网关端口配置）
        "http-listen": `0.0.0.0:${kGatewayHttpPort}`,
        "socks5-listen": `0.0.0.0:${kGatewaySocksPort}`,
        
        // external-controller-access: 外部控制器访问配置（用于 Surge API / 远程控制）
        // 格式: "password@ip:port"，例如: "your_password@0.0.0.0:6170"
        // iOS 上通常不需要此配置，如需启用请取消注释并修改密码
        // "external-controller-access": "your_password_here@0.0.0.0:6170",
        
        // 网络测试配置
        "internet-test-url": "http://www.gstatic.com/generate_204",
        "proxy-test-url": "http://www.gstatic.com/generate_204",
        "test-timeout": "5",
        
        // IPv6 配置（默认关闭）
        "ipv6": "false",
        "ipv6-vif": "disabled",
        
        // 注意：all-hybrid 是 Surge 6 新特性，Surge 5 不支持，已排除
        
        // 日志和错误页面
        "loglevel": "notify",
        "show-error-page-for-reject": "true",
        
        // DNS 配置（推荐配置）
        "dns-server": "8.8.8.8, 114.114.114.114, 119.28.28.28, system",
        // "encrypted-dns-server": "https://223.5.5.5/dns-query", // 加密 DNS（可选）
        "hijack-dns": "8.8.8.8:53, 8.8.4.4:53", // 劫持 DNS 查询
        "read-etc-hosts": "true", // 从 /etc/hosts 读取 DNS 记录
        "exclude-simple-hostnames": "true",
        
        // GeoIP 数据库（推荐使用国内源）
        "geoip-maxmind-url": "https://github.com/Hackl0us/GeoIP2-CN/raw/release/Country.mmdb",
        "disable-geoip-db-auto-update": "false",
        
        // 跳过代理配置
        // 注意：如果使用 VPN 客户端，可能需要将 VPN 接口添加到 skip-proxy 中
        // 例如：如果 VPN 客户端创建了 utun0 或 utun1 接口，可以添加 "utun0, utun1"
        // 或者将 VPN 客户端的 IP 段添加到 skip-proxy 中
        "skip-proxy": "127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com",
        
        // Always Real IP（游戏主机直连优化）
        "always-real-ip": "*.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.battlenet.com.cn, *.battlenet.com, *.blzstatic.cn, *.battle.net",
        
        // 其他配置
        "use-default-policy-if-wifi-not-primary": "false",
        "allow-wifi-access": "true",
        "enhanced-mode-by-rule": "false",
        "use-local-host-item-for-proxy": "false",
        
        // VPN 客户端协同配置（可选）
        // 方式 1：VPN 客户端作为 Surge 的上游代理
        // 在 [Proxy] 段中添加 VPN 客户端作为代理节点，例如：
        // "VPN-Client = http, 127.0.0.1, 8080"  // 假设 VPN 客户端提供 HTTP 代理
        // 然后在规则中使用该代理节点
        
        // 方式 2：Surge 作为 VPN 客户端的代理
        // 在 VPN 客户端中配置使用 Surge 的代理：
        // - HTTP 代理：127.0.0.1:8888
        // - SOCKS5 代理：127.0.0.1:8889
        
        // 方式 3：排除 VPN 接口（如果 VPN 客户端创建了虚拟网络接口）
        // 在 skip-proxy 中添加 VPN 接口名称，例如：utun0, utun1
        // 或者在 kCustomRules 中添加规则，让 VPN 流量直连
    },
    "Replica": {
        "hide-apple-request": "true",
        "hide-crashlytics-request": "true",
        "hide-udp": "false",
        "keyword-filter-type": "false",
    },
}

/**
 * ========== 自定义配置区域 ==========
 * 以下配置用于自定义扩展，可根据需要修改
 */

/**
 * kCustomRules
 * - 自定义业务规则：用于处理特殊应用 / 企业内网等场景，不方便通过通用 RULE-SET 覆盖时使用
 * - 这些规则会被添加到 [Rule] 段的最前面（最高优先级），会优先匹配并覆盖其他规则
 * - 优先级顺序：自定义业务规则 > 局域网规则 > 业务规则集 > 基础规则
 * 
 * 使用方式：
 * 1. 在下方添加自定义规则，格式：`规则类型, 匹配条件, 策略组名称`
 * 2. 如果规则中引用的策略组不存在，可以通过 kExtendedConfig 在 [Proxy Group] 段中添加
 * 3. 示例：
 *   - "DOMAIN-SUFFIX,example.com,MyCustomGroup"
 *   - "IP-CIDR,192.168.0.0/16,🌐 全球直连"
 */
const kCustomRules: string[] = [
    // === FortiClient VPN 配置示例 ===
    // 如果使用 FortiClient VPN，可以添加以下规则让 VPN 内网流量直连
    // 注意：根据实际的 FortiClient VPN 内网段调整 IP 段
    // "IP-CIDR,10.0.0.0/8,🌐 全球直连",  // FortiClient VPN 内网段（示例）
    // "IP-CIDR,172.16.0.0/12,🌐 全球直连",  // FortiClient VPN 内网段（示例）
    // "DOMAIN-SUFFIX,fortinet.com,🌐 全球直连",  // FortiClient 相关域名直连
    // "DOMAIN-SUFFIX,forticlient.com,🌐 全球直连",
    
    // 示例：企业内网规则
    // "DOMAIN-SUFFIX,internal.example.com,🏢 企业内网",
    // "DOMAIN-SUFFIX,corp.example.com,🏢 企业内网",
    
    // 示例：其他自定义业务规则
    // "DOMAIN-SUFFIX,example.com,MyCustomGroup",
    // "IP-CIDR,192.168.0.0/16,🌐 全球直连",
]

/**
 * kExtendedConfig
 * - 扩展配置：用于在基础配置之上添加额外的配置段
 * - 这些配置会被追加到主配置之后，允许你添加自定义的代理、策略组、规则等
 * - 格式：每个键对应一个配置段名称（如 "Proxy", "Proxy Group", "Rule", "Host" 等）
 * - 值为该配置段的字符串内容（不包含段标题，会自动添加）
 * 
 * 使用场景：
 * 1. 添加自定义策略组：在 kCustomRules 中引用的策略组，需要在此处定义
 * 2. 添加自定义代理节点：特殊场景下需要的代理节点
 * 3. 添加自定义规则：与 kCustomRules 配合使用
 * 4. 添加自定义 Host 解析：与 kDNS 配合使用
 * 
 * 示例：
 * - 如果 kCustomRules 中使用了 "MyCustomGroup"，则需要在此处添加：
 *   "Proxy Group": "MyCustomGroup = select, 🌐 全球直连, 🚀 所有节点\n"
 */
const kExtendedConfig: Record<string, string> = {
    // 示例：企业内网代理（直连）
    // "Proxy": "🏢 企业内网 = direct\n",
    
    // 示例：企业内网策略组（用于 kCustomRules 中引用，选择直连策略）
    // "Proxy Group": "🏢 企业内网 = select, 🌐 全球直连\n",
    
    // 示例：添加额外的代理节点
    // "Proxy": "MyCustomProxy = http, example.com, 8080, username=your_username, password=your_password\n",
    
    // 示例：添加额外的策略组（用于 kCustomRules 中引用的策略组）
    // "Proxy Group": "MyCustomGroup = select, 🌐 全球直连, 🚀 所有节点\n",
    
    // 示例：添加额外的规则
    // "Rule": "DOMAIN-SUFFIX,example.com,MyCustomGroup\n",
    
    // 示例：添加额外的 Host 解析
    // "Host": "example.com = 1.2.3.4\n",
}

/**
 * kDNS
 * - 自定义 Host 解析，等价于 Surge 的 [Host] 段
 * - 每一项为 [域名, IP]，例如 ["example.com", "1.2.3.4"]
 * - 与 kExtendedConfig 中的 "Host" 段配合使用
 */
const kDNS: [string, string][] = [
    // 示例：自定义 Host 解析
    // ["example.com", "1.2.3.4"],
]

export { kDNS, kRuleSet, kRules, kCustomRules, kSettingMac, kSettingIOS, kSurgeConfig, kGatewayHttpPort, kGatewaySocksPort, kLanConfig, kLocalLanRules, kExtendedConfig, kRegionConfig };

