/**
 * config/general.ts - 通用设置工厂
 * 
 * 根据平台 (Mac/iOS) 生成对应的 [General] 和 [Replica] 配置
 */

import { Platform } from './types';
import { PORTS, URLS, TIMEOUTS } from './constants';

export const getGeneralConfig = (platform: Platform): Record<string, Record<string, string>> => {
  const commonGeneral = {
    // 代理监听端口
    "http-listen": `0.0.0.0:${PORTS.GATEWAY_HTTP}`,
    "socks5-listen": `0.0.0.0:${PORTS.GATEWAY_SOCKS}`,

    // 网络测试配置
    "internet-test-url": URLS.TEST_INTERNET_APPLE,
    "proxy-test-url": URLS.TEST_PROXY_GOOGLE,
    "test-timeout": TIMEOUTS.TEST_TIMEOUT.toString(),

    // IPv6 配置 (已关闭以提高稳定性)
    ipv6: "false",
    "ipv6-vif": "disabled",

    // 日志和错误页面
    loglevel: "notify",
    "show-error-page-for-reject": "true",

    // DNS 配置
    // Bootstrap DNS: 阿里, 腾讯, 114, Google, system(内网必备)
    "dns-server": "223.5.5.5, 119.29.29.29, 114.114.114.114, 8.8.8.8, system",
    // Encrypted DNS (DoH): 阿里, 腾讯, Google
    "encrypted-dns-server": "https://dns.alidns.com/dns-query, https://doh.pub/dns-query, https://dns.google/dns-query",
    "hijack-dns": "8.8.8.8:53, 8.8.4.4:53",
    "read-etc-hosts": "true",
    "exclude-simple-hostnames": "true",

    // VIF 路由 (性能优化: 绕过局域网流量)
    // "tun-excluded-routes": "192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12",

    // GeoIP 数据库
    "geoip-maxmind-url": URLS.GEOIP_MMDB,
    "disable-geoip-db-auto-update": "false",

    // 跳过代理配置
    "skip-proxy": "127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com",

    // Always Real IP
    "always-real-ip": "*.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.battlenet.com.cn, *.battlenet.com, *.blzstatic.cn, *.battle.net",

    // 其他配置
    "use-default-policy-if-wifi-not-primary": "false",
    "allow-wifi-access": "true",
    "use-local-host-item-for-proxy": "false",
  };

  const commonReplica = {
    "hide-apple-request": "true",
    "hide-crashlytics-request": "true",
    "hide-udp": "false",
    "keyword-filter-type": "none",
  };

  // 平台特定差异
  const platformSpecific: Record<string, string> = platform === Platform.MAC ? {
    // Surge 6 / Mac 特性
    "all-hybrid": "true",
  } : {
    // iOS 特性
  };

  return {
    General: {
      ...commonGeneral,
      ...platformSpecific,
    },
    Replica: commonReplica,
  };
};
