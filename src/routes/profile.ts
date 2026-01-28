/**
 * routes/profile.ts - Profile Mode 路由
 *
 * 职责：
 * 1. 下载订阅
 * 2. 响应 /profile/mac 和 /profile/ios 请求
 * 3. 调用 Core 层生成配置
 */

import { Hono } from 'hono';
import { env } from 'bun';
import { downloadConfigs } from '../core/downloader';
import { compileSurgeConfig, getHostFromRequest } from '../core/generator';
import { buildProfileProxyGroups } from '../core/grouper';
import { kSettingMac, kSettingIOS, kGatewayHttpPort } from '../config/index';

const profile = new Hono();

// Helper: Download proxy nodes
async function getProxies() {
  const configs = await downloadConfigs();
  const proxy: Array<[string, string]> = [];
  for (const [name, config] of configs) {
    for (const [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value]);
    }
  }
  return proxy;
}

// Mac Profile
profile.get('/mac', async (c: any) => {
  console.log(`[请求] Profile Mode (Mac) - ${c.req.header('User-Agent') || 'Unknown'}`);

  const header = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/profile/mac interval=43200 tag=Mac-Profile-v1\n` +
                 "# app-version = Surge6\n" +
                 "# Mode: Profile (解析节点模式)\n";

  const proxies = await getProxies();
  const proxyNames = proxies.map(x => x[0]);
  const proxyGroupContent = buildProfileProxyGroups(proxyNames);

  const result = compileSurgeConfig(header, kSettingMac, proxies, proxyGroupContent);
  return c.text(result);
});

// iOS Profile
profile.get('/ios', async (c: any) => {
  console.log(`[请求] Profile Mode (iOS) - ${c.req.header('User-Agent') || 'Unknown'}`);

  const header = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/profile/ios interval=43200 tag=iOS-Profile-v1\n` +
                 "# app-version = Surge5\n" +
                 "# Mode: Profile (解析节点模式)\n";

  const proxies = await getProxies();
  const gatewayHost = getHostFromRequest(c);
  proxies.push(["Home-Gateway", `http, ${gatewayHost}, ${kGatewayHttpPort}`]);
  
  const proxyNames = proxies.map(x => x[0]);
  const proxyGroupContent = buildProfileProxyGroups(proxyNames);

  const result = compileSurgeConfig(header, kSettingIOS, proxies, proxyGroupContent);
  return c.text(result);
});

export default profile;

