# Surge 配置生成服务

基于 Bun + Hono + TypeScript 构建的 Surge 配置动态生成服务。

> ⚠️ **免责声明**
> 
> 本项目仅供个人学习研究使用。使用本项目产生的任何法律责任与作者无关。
> 请遵守当地法律法规，合理使用网络资源。作者不对使用本项目导致的任何
> 直接或间接损失承担责任。

## 功能特点

- 🔄 **双模式支持**
  - **Profile Mode**: 从订阅下载并解析节点
  - **Provider Mode**: 使用 policy-path 自动更新节点
- 🎧 **Vibe Coding 优化**: AI/开发场景自动选择美国节点
- 🌍 **智能地区分组**: 核心地区 + 其他地区合并
- 🔐 **敏感数据分离**: 订阅信息通过 `secrets.ts` 管理
- ⚡ **开机自启**: 支持 macOS LaunchAgent

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置订阅

```bash
# 复制模板
cp src/secrets.example.ts src/secrets.ts

# 编辑配置
vim src/secrets.ts
```

### 3. 启动服务

```bash
# 后台启动
./scripts/service.sh start

# 前台启动（调试）
./scripts/service.sh start -f

# 开机自启
./scripts/service.sh install
```

## API 端点

| 端点 | 平台 | 模式 | 说明 |
|:--|:--|:--|:--|
| `/profile/mac` | Mac | Profile | 解析节点，完整配置 |
| `/profile/ios` | iOS | Profile | 解析节点，含网关代理 |
| `/provider/mac` | Mac | Provider | 外部节点，自动更新 |
| `/provider/ios` | iOS | Provider | 外部节点，自动更新 |

### 兼容旧端点

| 端点 | 说明 |
|:--|:--|
| `/surge.conf` | 等同 `/profile/mac` |
| `/surge_ios.conf` | 等同 `/profile/ios` |
| `/surge_both.conf` | 等同 `/provider/mac` |
| `/surge_ios_both.conf` | 等同 `/provider/ios` |

## 服务管理

```bash
./scripts/service.sh start      # 启动
./scripts/service.sh stop       # 停止
./scripts/service.sh status     # 状态
./scripts/service.sh install    # 安装开机自启
./scripts/service.sh uninstall  # 卸载开机自启
```

## 项目结构

```text
src/
├── config/
│   ├── index.ts        # 配置统一导出
│   ├── regions.ts      # 地区配置
│   ├── rulesets.ts     # 规则集配置
│   ├── settings.ts     # General/Replica 设置
│   ├── rules.ts        # 规则配置
│   └── dns.ts          # DNS 配置
├── core/
│   ├── index.ts        # 模块导出
│   ├── downloader.ts   # 订阅下载
│   ├── grouper.ts      # 策略组构建
│   └── generator.ts    # 配置生成
├── routes/
│   ├── profile.ts      # Profile Mode 路由
│   └── provider.ts     # Provider Mode 路由
├── index.ts            # 入口文件
├── secrets.ts          # 敏感配置（Git 忽略）
└── secrets.example.ts  # 配置模板
```

## 配置说明

### secrets.ts

```typescript
// 订阅配置
export const kSubscriptions: [string, string][] = [
  ["订阅名称", "订阅URL"],
];

// 公司内网配置
export const kCompanyConfig = {
  enabled: true,
  name: "公司名称",
  policy: "🌐 全球直连",
  domains: ["*.company.com"],
  ips: ["10.0.0.0/8"],
};

// 自定义规则
export const kSecretCustomRules: string[] = [
  "DOMAIN-SUFFIX,example.com,DIRECT",
];
```

## 环境变量

| 变量 | 默认值 | 说明 |
|:--|:--|:--|
| `LISTEN_HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `3000` | 监听端口 |

## 技术栈

- [Bun](https://bun.sh/) - JavaScript 运行时
- [Hono](https://hono.dev/) - Web 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统

## License

MIT
