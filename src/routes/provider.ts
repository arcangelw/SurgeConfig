/**
 * routes/provider.ts - Provider Mode 路由
 *
 * 职责：
 * 1. 响应 /provider/mac 和 /provider/ios 请求
 * 2. 调用 Core 层生成配置
 */

import { Hono } from 'hono';
import { env } from 'bun';
import { compileSurgeConfig } from '../core/generator';
import { buildProviderProxyGroups } from '../core/grouper';
import { kSettingMac, kSettingIOS, kSurgeConfig } from '../config/index';

const provider = new Hono();

// Mac Provider
provider.get('/mac', async (c: any) => {
  console.log(`[请求] Provider Mode (Mac) - ${c.req.header('User-Agent') || 'Unknown'}`);

  if (kSurgeConfig.length === 0) {
    return c.text("# 错误：未配置订阅，请在 src/secrets.ts 中配置 kSubscriptions", 400);
  }

  const header = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/provider/mac interval=43200 tag=Mac-Provider-v1\n` +
                 "# app-version = Surge6\n" +
                 "# Mode: Provider (外部节点模式)\n";

  // 构建策略组内容
  const proxyGroupContent = buildProviderProxyGroups().replace("[Proxy Group]\n", ""); // grouper 可能会带 Header？检查实现。
  // 检查 grouper.ts: buildProviderProxyGroups 不带 [Proxy Group] 头吗？
  // 看代码：它只有 "# > 外部节点..."，没有 [Proxy Group]。
  // 确实，grouper.ts 的实现没有加 `[Proxy Group]`。

  const result = compileSurgeConfig(header, kSettingMac, [], proxyGroupContent);
  return c.text(result);
});

// iOS Provider
provider.get('/ios', async (c: any) => {
  console.log(`[请求] Provider Mode (iOS) - ${c.req.header('User-Agent') || 'Unknown'}`);

  if (kSurgeConfig.length === 0) {
    return c.text("# 错误：未配置订阅，请在 src/secrets.ts 中配置 kSubscriptions", 400);
  }

  const header = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/provider/ios interval=43200 tag=iOS-Provider-v1\n` +
                 "# app-version = Surge5\n" +
                 "# Mode: Provider (外部节点模式)\n";

  const proxyGroupContent = buildProviderProxyGroups();
  
  // iOS Provider 模式也可能需要 Gateway Host 代理？
  // 之前的 provider.ts 对于 iOS 有: 
  // let proxyContent = `🌐 全球直连 = direct\nHome-Gateway = http, ${gatewayHost}, ${kGatewayHttpPort}`;
  // r += "[Proxy]\n" + extendedConfig.mergeProxy(proxyContent) + "\n\n";
  // 但这一版我们简化了。如果需要，我们可以在这里构建 proxies 数组。
  
  // 恢复 Home-Gateway 逻辑 (如果需要保持一致性)
  // 不过 Provider 模式主要是作为外部策略组提供，通常不需要内置 Proxy 列表 (除了 Direct)
  // 之前的 provider.ts:
  // const gatewayHost = getHostFromRequest(c);
  // let proxyContent = ...
  
  // 既然之前的 iOS provider 有这个逻辑，我们加上
  const { getHostFromRequest } = await import('../core/generator');
  const { kGatewayHttpPort } = await import('../config/index');
  const gatewayHost = getHostFromRequest(c);
  const proxies: [string, string][] = [
    ["Home-Gateway", `http, ${gatewayHost}, ${kGatewayHttpPort}`]
  ];

  const result = compileSurgeConfig(header, kSettingIOS, proxies, proxyGroupContent);
  return c.text(result);
});

export default provider;

