/**
 * downloader.ts - 订阅下载与解析模块
 * 
 * 负责从远程订阅地址下载配置并解析代理节点
 */
import { parse } from 'ini';
import { kSurgeConfig } from '../config/index';

/**
 * 下载远程配置
 * @param url Surge/Shadowrocket 订阅地址，预期为 ini 格式
 */
export const downloadConfig = async (url: string): Promise<string> => {
  const startTime = Date.now();
  console.log(`[下载] 开始下载订阅: ${url}`);
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    const data = await resp.text();
    const duration = Date.now() - startTime;
    console.log(`[下载] 完成下载订阅: ${url} (耗时: ${duration}ms)`);
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[下载] 下载失败: ${url} (耗时: ${duration}ms)`, error);
    throw error;
  }
};

/**
 * 解析远程配置，提取 [Proxy] 段并移除内置 Direct
 * 仅保留远程订阅中定义的各个代理节点
 */
export const parseConfig = (config: string): Record<string, string> => {
  const resp = parse(config) as Record<string, any>;
  const proxy = resp["Proxy"] as Record<string, string>;
  if (proxy) {
    delete proxy["Direct"];
  }
  return proxy || {};
};

/**
 * 并发下载所有订阅配置
 * @returns [订阅名称, Proxy 列表] 的数组
 */
export const downloadConfigs = async (): Promise<Array<[string, Record<string, string>]>> => {
  const resp = await Promise.all(
    kSurgeConfig.map(async ([name, url]): Promise<[string, Record<string, string>]> => {
      return [name, parseConfig(await downloadConfig(url))];
    }),
  );
  return resp;
};

/**
 * 获取订阅配置列表（用于外部节点模式）
 */
export const getSubscriptionUrls = (): [string, string][] => {
  return kSurgeConfig;
};
