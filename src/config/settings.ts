/**
 * config/settings.ts - 基础设置配置
 * 
 * 定义 Surge 的 [General] / [Replica] 等基础设置
 */

// 网关代理端口配置
export const kGatewayHttpPort = 6152;
export const kGatewaySocksPort = 6153;

/**
 * Mac (Surge 6) 配置
 */
export const kSettingMac: Record<string, Record<string, string>> = {
  General: {
    // 代理监听端口
    "http-listen": `0.0.0.0:${kGatewayHttpPort}`,
    "socks5-listen": `0.0.0.0:${kGatewaySocksPort}`,

    // 网络测试配置
    "internet-test-url": "http://www.apple.com/library/test/success.html",
    "proxy-test-url": "http://www.gstatic.com/generate_204",
    "test-timeout": "3",

    // IPv6 配置 (已关闭以提高稳定性)
    ipv6: "false",
    "ipv6-vif": "disabled",

    // All Hybrid 网络并发（Surge 6 新特性）
    "all-hybrid": "true",

    // 日志和错误页面
    loglevel: "notify",
    "show-error-page-for-reject": "true",

    // DNS 配置
    // Bootstrap DNS: 阿里, 腾讯, 114, Google
    "dns-server": "223.5.5.5, 119.29.29.29, 114.114.114.114, 8.8.8.8, system",
    // Encrypted DNS (DoH): 阿里, 腾讯, Google
    "encrypted-dns-server": "https://dns.alidns.com/dns-query, https://doh.pub/dns-query, https://dns.google/dns-query",
    "hijack-dns": "8.8.8.8:53, 8.8.4.4:53",
    "read-etc-hosts": "true",
    "exclude-simple-hostnames": "true",

    // VIF 路由 (性能优化: 绕过局域网流量)
    "tun-excluded-routes": "192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12",

    // GeoIP 数据库
    "geoip-maxmind-url": "https://github.com/Hackl0us/GeoIP2-CN/raw/release/Country.mmdb",
    "disable-geoip-db-auto-update": "false",

    // 跳过代理配置
    "skip-proxy": "127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com",

    // Always Real IP
    "always-real-ip": "*.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.battlenet.com.cn, *.battlenet.com, *.blzstatic.cn, *.battle.net",

    // 其他配置
    "use-default-policy-if-wifi-not-primary": "false",
    "allow-wifi-access": "true",
    "use-local-host-item-for-proxy": "false",
  },
  Replica: {
    "hide-apple-request": "true",
    "hide-crashlytics-request": "true",
    "hide-udp": "false",
    "keyword-filter-type": "none",
  },
};

/**
 * iOS (Surge 5) 配置
 */
export const kSettingIOS: Record<string, Record<string, string>> = {
  General: {
    // 代理监听端口
    "http-listen": `0.0.0.0:${kGatewayHttpPort}`,
    "socks5-listen": `0.0.0.0:${kGatewaySocksPort}`,

    // 网络测试配置
    "internet-test-url": "http://www.apple.com/library/test/success.html",
    "proxy-test-url": "http://www.gstatic.com/generate_204",
    "test-timeout": "3",

    // IPv6 配置
    ipv6: "false",
    "ipv6-vif": "disabled",

    // 日志和错误页面
    loglevel: "notify",
    "show-error-page-for-reject": "true",

    // DNS 配置
    "dns-server": "223.5.5.5, 119.29.29.29, 114.114.114.114, 8.8.8.8, system",
    "encrypted-dns-server": "https://dns.alidns.com/dns-query, https://doh.pub/dns-query, https://dns.google/dns-query",
    "hijack-dns": "8.8.8.8:53, 8.8.4.4:53",
    "read-etc-hosts": "true",
    "exclude-simple-hostnames": "true",

    // VIF 路由
    "tun-excluded-routes": "192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12",

    // GeoIP 数据库
    "geoip-maxmind-url": "https://github.com/Hackl0us/GeoIP2-CN/raw/release/Country.mmdb",
    "disable-geoip-db-auto-update": "false",

    // 跳过代理配置
    "skip-proxy": "127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com",

    // Always Real IP
    "always-real-ip": "*.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.battlenet.com.cn, *.battlenet.com, *.blzstatic.cn, *.battle.net",

    // 其他配置
    "use-default-policy-if-wifi-not-primary": "false",
    "allow-wifi-access": "true",
    "use-local-host-item-for-proxy": "false",
  },
  Replica: {
    "hide-apple-request": "true",
    "hide-crashlytics-request": "true",
    "hide-udp": "false",
    "keyword-filter-type": "none",
  },
};
