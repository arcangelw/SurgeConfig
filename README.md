## 项目简介

这是一个基于 **Bun + Hono + TypeScript** 的 **Surge 托管配置生成服务**，主要特性：

- 支持 **Surge Mac 6**（含家庭旁路网关场景）和 **Surge iOS 5**；
- 提供两种配置模式：
  - **解析节点模式**：从多个机场订阅中拉取 `[Proxy]` 节点并合并
  - **外部节点模式**：使用 `policy-path` 和 `smart` 策略组，支持自动更新
- 使用 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 提供的 Surge 规则；
- 配置化地区识别，支持扩展新地区（🇭🇰 香港 / 🇨🇳 台湾 / 🇺🇲 美国 / 🇯🇵 日本 / 🇸🇬 新加坡）；
- **自定义业务规则**：支持最高优先级的自定义规则，适用于企业内网、特殊应用等场景；
- **VPN 客户端协同**：支持与 FortiClient 等 VPN 客户端协同使用；
- **统一配置管理**：两种模式共享 `kSurgeConfig` 配置，降低维护难度。

---

## 1. 安装与运行

### 1.1 安装依赖

```sh
cd /path/to/SurgeConfig
bun install
```

### 1.2 本机运行（开发 / 可携带 Mac）

```sh
HOSTNAME=127.0.0.1 PORT=3000 bun run dev
# 或
HOSTNAME=127.0.0.1 PORT=3000 bun run start
```

然后在这台 Mac 的 Surge 中添加托管配置：

- 本机访问：`http://127.0.0.1:3000/surge.conf`

### 1.3 家中网关 Mac mini（旁路网关）

- 在 `src/config.ts` 中，网关 HTTP 代理端口由 `kGatewayHttpPort` 控制（默认 `6152`），对应：
  - `http-listen = 0.0.0.0:6152`
  - `socks5-listen = 0.0.0.0:6153`

在网关 Mac 上运行服务（开发/测试）：

```sh
cd /path/to/SurgeConfig
# 仅本机测试
HOSTNAME=127.0.0.1 PORT=3000 bun run start
# 希望局域网其它设备访问时：监听 0.0.0.0
HOSTNAME=0.0.0.0 PORT=3000 bun run start
```

- 本机访问：`http://127.0.0.1:3000/surge.conf`
- 局域网其它设备访问：`http://<网关Mac的局域网IP>:3000/surge.conf`

将路由器 DHCP 指向这台网关，即可作为家庭旁路使用。

> 推荐：使用项目根目录下的 `setup_launchagent.sh` 生成 LaunchAgent，实现登录自动启动。

### 1.4 开机自启与后台常驻（LaunchAgent）

项目根目录提供两个脚本：

- `setup_launchagent.sh`：创建并加载 `~/Library/LaunchAgents/com.surgeconfig.server.plist`，实现**登录自动启动 + 后台常驻**。
- `remove_launchagent.sh`：停止并删除对应的 LaunchAgent 配置。

使用方式：

```sh
cd /path/to/SurgeConfig
chmod +x setup_launchagent.sh remove_launchagent.sh

# 开启开机自启并立即启动服务
./setup_launchagent.sh

# 如需停止并移除开机自启
./remove_launchagent.sh
```

`setup_launchagent.sh` 默认生成的配置为：

- 监听地址：`HOSTNAME=0.0.0.0`（允许局域网其它设备访问）
- 本机访问示例：
  - `http://127.0.0.1:3000/surge.conf`
  - `http://127.0.0.1:3000/surge_ios.conf`
- 局域网其它设备访问时，请使用这台 Mac 的**实际局域网 IP**，例如：
  - `http://192.168.x.x:3000/surge.conf`
  - `http://192.168.x.x:3000/surge_ios.conf`

---

## 2. 在 Surge 中使用

### 2.1 配置模式说明

项目提供两种配置模式：

#### 解析节点模式（默认）
- **端点**：`/surge.conf`（Mac）、`/surge_ios.conf`（iOS）
- **特点**：从订阅下载并解析节点，生成完整的节点列表
- **适用场景**：需要查看所有节点、手动选择节点

#### 外部节点模式（推荐）
- **端点**：`/surge_both.conf`（Mac）、`/surge_ios_both.conf`（iOS）
- **特点**：使用 `policy-path` 直接指向订阅，支持自动更新；使用 `smart` 策略组自动选择最优节点
- **适用场景**：希望配置自动更新，无需重新生成；使用智能策略组自动选择节点
- **启用方式**：在 `src/config.ts` 中配置 `kSurgeConfig`（第一个配置将用于外部节点模式）

### 2.2 Mac（Surge 6）

#### 解析节点模式
- 托管配置地址：`http://<HOSTNAME>:<PORT>/surge.conf`
- 示例：
  - 网关 Mac：`http://192.168.51.3:3000/surge.conf`
  - 可携带 Mac：`http://127.0.0.1:3000/surge.conf`

#### 外部节点模式（smart 策略组）
- 托管配置地址：`http://<HOSTNAME>:<PORT>/surge_both.conf`
- 示例：`http://192.168.51.3:3000/surge_both.conf`
- 特点：配置自动更新，smart 策略组自动选择最优节点

生成的文件头部类似：

```text
#!MANAGED-CONFIG http://HOST:PORT/surge.conf interval=43200 tag=Mac-Surge6-v1
# app-version = Surge6
# 此配置使用解析节点模式（从订阅下载并解析节点）
```

### 2.3 iOS（Surge 5）

#### 解析节点模式
- 托管配置地址：`http://<网关IP>:<PORT>/surge_ios.conf`
- 示例：`http://192.168.51.3:3000/surge_ios.conf`

#### 外部节点模式（smart 策略组）
- 托管配置地址：`http://<网关IP>:<PORT>/surge_ios_both.conf`
- 示例：`http://192.168.51.3:3000/surge_ios_both.conf`

iOS 配置中会自动添加一条指向家庭网关的代理：

```text
Home-Gateway = http, <你访问订阅时的 Host>, 6152
```

- 在家：在策略组里选择 `Home-Gateway` → 通过网关 Mac 上网；
- 外出：选择机场节点或外网策略组（例如 `🇸🇬 新加坡节点` / `🇺🇲 美国节点`）。

---

## 3. 配置入口：`src/config.ts`

### 3.1 填写你的机场订阅：`kSurgeConfig`

```ts
/**
 * kSurgeConfig
 * - 统一的订阅配置，同时用于解析节点模式和外部节点模式
 * - 每一项为 [配置名称, 订阅 URL]，名称会作为前缀出现在最终的 Proxy 名称里（如 NAME-节点名）
 * - 解析节点模式：使用所有配置，下载并解析节点
 * - 外部节点模式：使用第一个配置，通过 policy-path 自动更新
 */
const kSurgeConfig: [string, string][] = [
  // ["NAME", "CONFIG_URL"],
  // ["MyProvider", "https://example.com/surge.conf"],
]
```

**使用说明：**
- **解析节点模式**（`/surge.conf`, `/surge_ios.conf`）：使用所有配置的节点，下载并解析后合并
- **外部节点模式**（`/surge_both.conf`, `/surge_ios_both.conf`）：使用第一个配置作为外部节点源，支持自动更新
- 建议订阅里的节点名称中带上地区 emoji 或关键词，以便自动归类到对应地区策略组
- 支持的地区见 `kRegionConfig` 配置

**优势：**
- ✅ 只需维护一个配置列表，降低维护难度
- ✅ 两种模式共享同一订阅源，配置更统一
- ✅ 外部节点模式支持自动更新，无需重新生成配置

### 3.2 地区配置：`kRegionConfig`

```ts
/**
 * kRegionConfig
 * - 地区配置：定义各个地区的识别规则和策略组生成规则
 * - 通过配置即可扩展新地区，无需修改代码
 */
const kRegionConfig: Record<string, {
  name: string           // 地区显示名称
  emoji: string          // Emoji 标识
  matchPatterns: string[] // 节点名称匹配规则
  regexFilter: string    // 正则过滤器（用于外部节点模式）
  hasManualGroup?: boolean // 是否生成手动策略组
  excludeOnHKAndTW?: boolean // 是否在 excludeHKAndTW 时排除
  order: number         // 显示顺序
}> = {
  // 示例：添加新地区
  // kr: {
  //   name: "韩国",
  //   emoji: "🇰🇷",
  //   matchPatterns: ["韩国", "korea", "KR"],
  //   regexFilter: "(🇰🇷)|(韩)|(Korea)|(KR)",
  //   hasManualGroup: true,
  //   order: 6
  // }
}
```

- 通过添加配置即可扩展新地区，无需修改代码
- 系统会自动识别节点并生成对应的策略组

### 3.3 规则来源：`kRuleSet` & `kLanConfig`

- `kRuleSet`：业务规则集，全部来自 blackmatrix7：
  - Apple / OpenAI / TikTok / Twitter / Telegram / Disney / Netflix / Microsoft / Claude / Gemini / Google / Global / GitHub / China / ChinaIP 等。
- 局域网直连：
  - 通过 `kLanConfig` 控制：

```ts
const kLanConfig = {
  // true: 使用 blackmatrix7 的 Lan.list
  // false: 使用本地 CIDR 直连规则
  useRemoteLanRuleSet: false,
}
```

### 3.4 自定义业务规则：`kCustomRules` 和 `kExtendedConfig`

#### `kCustomRules`：自定义业务规则

用于处理特殊应用 / 企业内网等场景，不方便通过通用 RULE-SET 覆盖时使用。

```ts
const kCustomRules: string[] = [
  // 示例：企业内网规则
  // "DOMAIN-SUFFIX,internal.example.com,🏢 企业内网",
  // "DOMAIN-SUFFIX,corp.example.com,🏢 企业内网",
  
  // 示例：其他自定义业务规则
  // "DOMAIN-SUFFIX,example.com,MyCustomGroup",
  // "IP-CIDR,192.168.0.0/16,🌐 全球直连",
]
```

这些规则会被添加到 `[Rule]` 段的最前面（最高优先级），会优先匹配并覆盖其他规则。

#### `kExtendedConfig`：扩展配置

用于在基础配置之上添加额外的配置段，支持自定义代理、策略组、规则和 Host 解析。

**使用场景：**
1. 添加自定义策略组：在 `kCustomRules` 中引用的策略组，需要在此处定义
2. 添加自定义代理节点：特殊场景下需要的代理节点
3. 添加自定义规则：与 `kCustomRules` 配合使用
4. 添加自定义 Host 解析：与 `kDNS` 配合使用

**示例：**

```ts
const kExtendedConfig: Record<string, string> = {
  // 示例：企业内网代理（直连）
  // "Proxy": "🏢 企业内网 = direct\n",
  
  // 示例：企业内网策略组（用于 kCustomRules 中引用）
  // "Proxy Group": "🏢 企业内网 = select, 🌐 全球直连\n",
  
  // 示例：添加额外的代理节点
  // "Proxy": "MyCustomProxy = http, example.com, 8080, username=your_username, password=your_password\n",
  
  // 示例：添加额外的策略组
  // "Proxy Group": "MyCustomGroup = select, 🌐 全球直连, 🚀 所有节点\n",
  
  // 示例：添加额外的规则
  // "Rule": "DOMAIN-SUFFIX,example.com,MyCustomGroup\n",
  
  // 示例：添加额外的 Host 解析
  // "Host": "example.com = 1.2.3.4\n",
}
```

**注意事项：**
- 配置内容不包含段标题（如 `[Proxy]`），系统会自动添加
- 每个配置段的内容会自动合并到对应的主配置段中
- 扩展配置会在主配置之后添加，并带有注释标识

---

## 4. 规则与分流结构

最终生成的 `[Rule]` 段整体顺序为（按优先级从高到低）：

1. **自定义业务规则**（`kCustomRules`）- 最高优先级，优先匹配
2. 局域网规则（`Lan.list` 或本地 CIDR）
3. 业务 RULE-SET（Apple / OpenAI / Twitter / Telegram / China / …）
4. 基础规则（如 `FINAL,⚡ Final,dns-failed`）

**优先级说明**：
- 自定义业务规则具有最高优先级，会优先匹配并覆盖其他规则
- 如果自定义规则匹配到某个域名，即使其他规则集也包含该域名，也会使用自定义规则指定的策略组
- 这适用于企业内网、特殊应用等需要精确控制的场景

核心构建逻辑位于 `src/index.ts` 的 `_buildRules` 函数。

---

## 5. 策略组说明

所有代理最终汇总到 `[Proxy Group]`，生成的配置包含详细注释，便于理解。

### 5.1 基础策略组

- `🌐 全球直连`：直连策略（direct）
- `🚀 所有节点`：所有节点的汇总选择器
  - 解析节点模式：包含所有解析的节点
  - 外部节点模式：使用 `policy-path` 自动从订阅更新

### 5.2 地区策略组

根据 `kRegionConfig` 配置自动生成，支持扩展：

- **自动策略组**（smart / url-test）：
  - `🇭🇰 香港节点`、`🇨🇳 台湾节点`、`🇺🇲 美国节点`、`🇯🇵 日本节点`、`🇸🇬 新加坡节点`
  - 解析节点模式：使用 `url-test`，每 600 秒测试一次，选择延迟最低的节点
  - 外部节点模式：使用 `smart`，实时监控多维度指标，自动选择最优节点

- **手动策略组**（select）：
  - `🇺🇲 美国-手动`、`🇸🇬 新加坡-手动`
  - 手动选择具体节点

- **组合策略组**：
  - `🎧 Vibe-Coding`：开发 / 编码场景下常用的外网出海组合

### 5.3 业务分流策略组

根据 `kRuleSet` 配置自动生成：

- **AI 服务**：OpenAI、Claude、Gemini（自动排除香港/台湾节点）
- **社交媒体**：Twitter、Telegram、TikTok
- **流媒体**：Netflix、Disney
- **其他服务**：Apple、Google、Microsoft、GitHub 等

### 5.4 自定义业务策略组

通过 `kExtendedConfig` 配置的自定义策略组，例如：

- `🏢 企业内网`：企业内网策略组（直连，示例）
- 其他自定义策略组：根据 `kExtendedConfig` 中的配置自动生成

### 5.5 最终策略

- `⚡ Final`：所有规则未命中时的最终策略

> 所有策略组都包含详细注释，说明其用途和特点。

---

## 6. Surge 与 VPN 客户端协同使用

Surge 可以与 VPN 客户端一起使用，有以下几种方式：

### 6.1 VPN 客户端作为 Surge 的上游代理

**适用场景**：希望通过 Surge 的路由规则来控制哪些流量走 VPN。

**配置步骤**：
1. 在 VPN 客户端中启用本地代理（HTTP/SOCKS5）
2. 在 `kExtendedConfig` 的 `"Proxy"` 中添加 VPN 客户端作为代理节点：
   ```ts
   "Proxy": "VPN-Client = http, 127.0.0.1, 8080\n"
   ```
3. 在规则中使用该代理节点，例如在 `kCustomRules` 中添加：
   ```ts
   "DOMAIN-SUFFIX,example.com,VPN-Client"
   ```

### 6.2 Surge 作为 VPN 客户端的代理

**适用场景**：VPN 客户端支持配置上游代理。

**配置步骤**：
1. 在 VPN 客户端中配置使用 Surge 的代理：
   - **Mac**：HTTP 代理 `127.0.0.1:6152`，SOCKS5 代理 `127.0.0.1:6153`
   - **iOS**：HTTP 代理 `127.0.0.1:8888`，SOCKS5 代理 `127.0.0.1:8889`
2. VPN 客户端的流量会先经过 Surge，再由 Surge 根据规则路由

### 6.3 排除 VPN 接口

**适用场景**：VPN 客户端创建了虚拟网络接口（如 `utun0`、`utun1`），希望 VPN 流量不走 Surge。

**配置步骤**：
1. 查看 VPN 客户端创建的网络接口名称（在终端运行 `ifconfig` 查看）
2. 在 `kSettingMac` 或 `kSettingIOS` 的 `skip-proxy` 中添加接口名称：
   ```ts
   "skip-proxy": "127.0.0.1, 192.168.0.0/16, utun0, utun1, ..."
   ```
3. 或者在 `kCustomRules` 中添加规则，让 VPN 相关流量直连

### 6.4 FortiClient VPN 配置示例

**FortiClient** 是企业常用的 VPN 客户端，配置方式如下：

#### 步骤 1：识别 FortiClient 创建的接口

在终端运行以下命令查看 FortiClient 创建的虚拟网络接口：

```bash
ifconfig | grep -E "utun|fgt"
```

常见的接口名称包括：`utun0`, `utun1`, `fgt0` 等。

#### 步骤 2：配置 skip-proxy

在 `kSettingMac` 或 `kSettingIOS` 的 `skip-proxy` 中添加 FortiClient 接口：

```ts
"skip-proxy": "127.0.0.1, 192.168.0.0/16, utun0, utun1, fgt0, ..."
```

#### 步骤 3：配置规则（可选）

如果希望 FortiClient VPN 内网流量直连，在 `kCustomRules` 中添加：

```ts
const kCustomRules: string[] = [
  // FortiClient VPN 内网段直连（根据实际 VPN 内网段调整）
  "IP-CIDR,10.0.0.0/8,🌐 全球直连",      // 示例：10.x.x.x 段
  "IP-CIDR,172.16.0.0/12,🌐 全球直连",   // 示例：172.16-31.x.x 段
  
  // FortiClient 相关域名直连
  "DOMAIN-SUFFIX,fortinet.com,🌐 全球直连",
  "DOMAIN-SUFFIX,forticlient.com,🌐 全球直连",
]
```

#### 步骤 4：验证配置

1. 启动 FortiClient 并连接到 VPN
2. 在 Surge 中查看连接日志，确认 VPN 流量是否正确处理
3. 测试内网访问是否正常

### 6.5 注意事项

- **TUN 模式冲突**：Surge 的 TUN 模式和 VPN 客户端可能冲突，因为它们都会创建虚拟网络接口
- **DNS 解析**：确保 DNS 配置正确，避免 DNS 泄露
- **路由优先级**：Surge 的规则优先级高于 VPN 客户端，可以通过规则精确控制流量
- **接口名称**：不同版本的 FortiClient 可能创建不同名称的接口，需要根据实际情况调整

---

## 7. 推荐使用习惯

- **日常出海浏览 / 办公**
  - 首选：`🎧 Vibe-Coding`（自动在多个地区组之间选择）
  - 或选择：`🇸🇬 新加坡节点` / `🇺🇲 美国节点`（自动选择最快节点）

- **AI / Google 等关键业务**
  - 在对应业务组中：
    - 日常选 `🇺🇲 美国节点` / `🇸🇬 新加坡节点`（自动选择）
    - 若遇到风控或延迟问题，再切到对应的 `🇺🇲 美国-手动` / `🇸🇬 新加坡-手动` 选择具体节点

- **企业内网 / 特殊业务**
  - 在 `kCustomRules` 中添加自定义规则，利用最高优先级特性
  - 例如：企业内网域名、FortiClient VPN 内网段等


