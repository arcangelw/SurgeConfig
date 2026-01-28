/**
 * config/constants.ts - 常量定义
 */

export const PORTS = {
  GATEWAY_HTTP: 6152,
  GATEWAY_SOCKS: 6153,
};

export const URLS = {
  TEST_INTERNET_APPLE: "http://www.apple.com/library/test/success.html", // 物理连接测试
  TEST_PROXY_GOOGLE: "http://www.gstatic.com/generate_204", // 代理连通性测试
  GEOIP_MMDB: "https://github.com/Hackl0us/GeoIP2-CN/raw/release/Country.mmdb",
};

export const TIMEOUTS = {
  TEST_TIMEOUT: 3, // 秒
};
