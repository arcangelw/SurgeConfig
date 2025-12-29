/**
 * Surge 配置生成服务入口
 *
 * 主要职责：
 * - 从多个远程 Surge/Shadowrocket 订阅中提取 [Proxy] 段，统一合并。
 * - 根据本地定义的规则与基础配置，动态生成完整的 Surge 配置文件。
 * - 为 Mac（Surge 6）和 iOS（Surge 5）分别提供订阅入口。
 *
 * 路由模式：
 * - Profile Mode (/profile/*): 解析节点模式，从订阅下载并解析节点
 * - Provider Mode (/provider/*): 外部节点模式，使用 policy-path 自动更新
 * - Legacy Mode (/*.conf): 兼容旧版端点
 */
import { env } from 'bun'
import { Hono } from 'hono'
import { parse } from 'ini'
import { kDNS, kRuleSet, kRules, kCustomRules, kSettingMac, kSettingIOS, kSurgeConfig, kGatewayHttpPort, kLanConfig, kLocalLanRules, kExtendedConfig, kRegionConfig } from './config/index'

// 导入新路由模块
import profileRoutes from './routes/profile'
import providerRoutes from './routes/provider'

const app = new Hono()

// 注册新路由
app.route('/profile', profileRoutes)
app.route('/provider', providerRoutes)

/**
 * 下载远程配置
 * @param url Surge/Shadowrocket 订阅地址，预期为 ini 格式
 */
const downloadConfig = async (url: string): Promise<string> => {
  const startTime = Date.now()
  console.log(`[下载] 开始下载订阅: ${url}`)
  try {
    let resp = await fetch(url)
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    }
    let data = await resp.text()
    const duration = Date.now() - startTime
    console.log(`[下载] 完成下载订阅: ${url} (耗时: ${duration}ms)`)
    return data
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[下载] 下载失败: ${url} (耗时: ${duration}ms)`, error)
    throw error
  }
}

/**
 * 解析远程配置，提取 [Proxy] 段并移除内置 Direct
 * 仅保留远程订阅中定义的各个代理节点。
 */
const parseConfig = (config: string): Record<string, string> => {
  const resp = parse(config) as Record<string, any>
  const proxy = resp["Proxy"] as Record<string, string>
  delete proxy["Direct"]
  return proxy
}

/**
 * 并发下载所有订阅配置，并解析为 [订阅名称, Proxy 列表] 的数组。
 */
const downloadConfigs = async (): Promise<Array<[string, Record<string, string>]>> => {
  const resp = await Promise.all(
    kSurgeConfig.map(async ([name, url]): Promise<[string, Record<string, string>]> => {
      return [name, parseConfig(await downloadConfig(url))]
    }),
  )

  return resp
}

/**
 * 从请求头中提取当前访问的主机名（不含端口）
 * - 这样在局域网中访问生成订阅时，可以自动使用网关当前的 IP/域名。
 */
const getHostFromRequest = (c: any): string => {
  const host = c.req.header('Host') || ''
  return host.split(':')[0] || host
}

/**
 * 构建通用配置段（[General] / [Replica] 等）
 * @param setting 形如 { SectionName: { key: value } } 的配置对象
 */
const _buildSetting = (setting: Record<string, Record<string, string>>): string => {
  let result = ""
  Object.keys(setting).forEach((sectionName) => {
    result += `[${sectionName}]\n`
    const section = setting[sectionName]
    Object.keys(section).forEach((key) => {
      result += `${key} = ${section[key]}\n`
    })

    result += "\n"
  })
  return result
}

/**
 * 构建 [Proxy] 段
 * - 默认添加一个 Direct 直连项。
 * - proxy 参数为 [名称, 参数字符串] 的数组。
 */
const _buildProxy = (proxy: Array<[string, string]>): string => {
  let result = "[Proxy]\n"
  result += "# 统一的直连策略，后续所有分组中不再直接引用 Direct，而是使用 🌐 全球直连\n"
  result += "🌐 全球直连 = direct\n"
  if (proxy.length > 0) {
    result += `# 共 ${proxy.length} 个代理节点\n`
    result += proxy.map((x) => `${x[0]}=${x[1]}`).join("\n")
  }
  result += "\n"
  return result
}

/**
 * 按地区对节点做简单分组，基于配置自动识别
 * @param proxyNames 节点名称列表
 * @returns 按地区分组的节点映射
 */
const _bucketProxyByRegion = (proxyNames: string[]): Record<string, string[]> => {
  const buckets: Record<string, string[]> = {}

  // 初始化所有地区的桶
  for (const regionKey of Object.keys(kRegionConfig)) {
    buckets[regionKey] = []
  }

  for (const name of proxyNames) {
    const lower = name.toLowerCase()
    const upper = name.toUpperCase()
    let matched = false

    // 遍历所有地区配置，匹配节点名称
    for (const [regionKey, config] of Object.entries(kRegionConfig)) {
      for (const pattern of config.matchPatterns) {
        const patternLower = pattern.toLowerCase()
        const patternUpper = pattern.toUpperCase()

        // 匹配逻辑：包含关键词或匹配正则（对于 TW 等特殊处理）
        if (
          name.includes(pattern) ||
          lower.includes(patternLower) ||
          upper.includes(patternUpper) ||
          (patternUpper === "TW" && /[-_\s]tw\b/i.test(name))
        ) {
          buckets[regionKey].push(name)
          matched = true
          break
        }
      }
      if (matched) break
    }
  }

  return buckets
}

/**
 * 构建标准策略组列表（统一复用逻辑）
 * - 用于业务分流、自定义业务、兜底策略等
 * - 包含：🌐 全球直连、🚀 所有节点、🎧 Vibe-Coding + 地区组
 * - 根据业务名称（ruleName）对候选顺序做轻微优化：
 *   - AI / 开发相关（OpenAI / Claude / Gemini / Google / Github / Microsoft）：
 *     优先推荐 🎧 Vibe-Coding → 其次 🚀 所有节点 → 最后 🌐 全球直连
 *   - Apple：优先推荐 🌐 全球直连（系统服务更稳）→ 🎧 Vibe-Coding → 🚀 所有节点
 *   - 兜底 ⚡ Final：优先 🌐 全球直连，再给 🎧 Vibe-Coding 和 🚀 所有节点 作为备选
 *   - 其他业务：保持原有顺序（🌐 全球直连, 🚀 所有节点, 🎧 Vibe-Coding）
 * @param allNodesName 所有节点策略组名称（"🚀 所有节点" 或外部节点模式中的名称）
 * @param regionGroupNames 地区策略组名称映射（解析节点模式使用）
 * @param regionBuckets 地区节点分桶（解析节点模式使用，用于检查节点是否存在）
 * @param excludeHKAndTW 是否排除香港和台湾
 * @param isExternalMode 是否为外部节点模式
 * @param ruleName 业务名称（用于优化候选顺序，如 "Apple" / "OpenAI" 等）
 */
const _buildStandardGroups = (
  allNodesName: string,
  excludeHKAndTW: boolean = false,
  isExternalMode: boolean = false,
  regionGroupNames?: Record<string, string[]>,
  regionBuckets?: Record<string, string[]>,
  ruleName?: string,
  extraGroups?: string[]
): string[] => {
  // 根据业务类型对基础候选顺序做一点优化
  let baseGroups: string[]
  const ruleConfig = ruleName ? kRuleSet[ruleName] : undefined
  const optimizeType = ruleConfig?.optimizeGroup

  if (optimizeType === "ai") {
    // AI / 开发相关：优先推荐 🎧 Vibe-Coding
    baseGroups = ["🎧 Vibe-Coding", allNodesName, "🌐 全球直连"]
  } else if (optimizeType === "apple") {
    // Apple：默认优先直连，避免账号 / 区域风控
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName]
  } else if (ruleName === "__final__") {
    // Final 兜底：优先直连，其次 AI 出口和所有节点
    baseGroups = ["🌐 全球直连", "🎧 Vibe-Coding", allNodesName]
  } else {
    // 其他业务：保持原有默认顺序
    baseGroups = ["🌐 全球直连", allNodesName, "🎧 Vibe-Coding"]
  }

  const groups: string[] = [...baseGroups]

  // 插入额外分组（例如 "☁️ 订阅来源"）
  if (extraGroups && extraGroups.length > 0) {
    groups.push(...extraGroups)
  }

  const sortedRegions = Object.entries(kRegionConfig).sort((a, b) => a[1].order - b[1].order)

  // 按配置顺序添加地区组
  for (const [regionKey, config] of sortedRegions) {
    if (excludeHKAndTW && config.excludeOnHKAndTW) {
      continue
    }

    if (isExternalMode) {
      // 外部节点模式：使用传入的 regionGroupNames (包含了细分和聚合组)
      const names = regionGroupNames?.[regionKey]
      if (names && names.length > 0) {
        groups.push(...names)
      }
    } else {
      // 解析节点模式：从 regionGroupNames 获取
      // regionGroupNames 这里已经是适配好的 string[] 数组
      const names = regionGroupNames?.[regionKey]
      if (names && names.length > 0) {
        // 检查是否有节点 (regionBuckets)
        if (regionBuckets && regionBuckets[regionKey]?.length === 0) {
          continue
        }
        groups.push(...names)
      }
    }
  }

  return groups
}

/**
 * 构建基于外部节点的策略组（使用 policy-path 和 policy-regex-filter）
 * - 使用 policy-path 直接指向订阅 URL，让配置可以自动更新
 * - 使用 policy-regex-filter 通过正则表达式过滤节点
 * @param forceExternal 是否强制使用外部节点模式
 */
const _buildExternalProxyGroup = (forceExternal: boolean = false): string => {
  let result = ""

  // 如果没有配置，返回空字符串
  if (kSurgeConfig.length === 0) {
    return result
  }

  if (forceExternal) {
    result += "# > 外部节点\n"
    result += "# 使用 policy-path 自动更新，smart 策略组自动选择最优节点\n\n"
  }

  const allNodesName = "🚀 所有节点"
  const sortedRegions = Object.entries(kRegionConfig).sort((a, b) => a[1].order - b[1].order)

  // 用于收集所有地区的策略组名称（按地区分类），用于传给 _buildStandardGroups
  const regionAllGroupsMap: Record<string, string[]> = {}

  // 1. 生成 [Region] [Subscription] 颗粒细分策略组 & [Region] 聚合策略组
  const vibeCodingGroups: string[] = []

  for (const [regionKey, config] of sortedRegions) {
    const regionSubGroupsAuto: string[] = []   // 当前地区-订阅-Auto
    const regionSubGroupsManual: string[] = [] // 当前地区-订阅-Manual

    // 收集该地区所有可用的组（用于业务引用）
    const regionAllGroups: string[] = []

    // 聚合组名称
    const regionAggregateName = `${config.emoji} ${config.name}节点` // Auto Aggregate
    const regionManualName = `${config.emoji} ${config.name}-手动`   // Manual Aggregate

    // 如果是 onlyManual 模式，只生成手动选择组
    if (config.onlyManual) {
      // 只生成一个手动选择的聚合组
      regionAllGroups.push(regionAggregateName)

      const allSubGroups: string[] = []
      kSurgeConfig.forEach(([subName, subUrl]) => {
        const subGroupName = `${config.emoji} ${config.name}-${subName}`
        allSubGroups.push(subGroupName)
        regionAllGroups.push(subGroupName)

        result += `# ${config.name}地区-${subName}订阅（手动选择）\n`
        result += `${subGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`
      })

      // 生成手动聚合组
      result += `# ${config.name}地区聚合（手动选择）\n`
      result += `${regionAggregateName} = select, ${allSubGroups.join(",")}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`

      // 保存该地区的所有组列表
      regionAllGroupsMap[regionKey] = regionAllGroups
      continue
    }

    // 正常模式：生成自动和手动策略组
    // 聚合组排在前面
    regionAllGroups.push(regionAggregateName)
    if (config.hasManualGroup) {
      regionAllGroups.push(regionManualName)
    }

    // 遍历所有订阅，生成细分策略组
    kSurgeConfig.forEach(([subName, subUrl]) => {
      // --- Smart Group (Auto) ---
      // 命名格式：Emoji RegionName-SubName (紧凑)
      const subGroupName = `${config.emoji} ${config.name}-${subName}`
      regionSubGroupsAuto.push(subGroupName)
      regionAllGroups.push(subGroupName)

      result += `# ${config.name}地区-${subName}订阅\n`
      result += `${subGroupName} = smart, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`

      // Vibe-Coding Granular Auto
      if (config.includeInVibeGroup) {
        vibeCodingGroups.push(subGroupName)
      }

      // --- Manual Group (Select) ---
      if (config.hasManualGroup) {
        const subManualGroupName = `${config.emoji} ${config.name}-${subName}-手动`
        regionSubGroupsManual.push(subManualGroupName)
        // regionAllGroups.push(subManualGroupName) // 不再加入业务引用列表 (由聚合组代理)

        result += `# ${config.name}地区-${subName}订阅-手动\n`
        result += `${subManualGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0, policy-regex-filter=${config.regexFilter}\n`

        // Vibe-Coding Granular Manual
        if (config.includeInVibeGroup) {
          vibeCodingGroups.push(subManualGroupName)
        }
      }
    })

    // --- 生成聚合组 ---

    // 1. Auto Aggregate (Smart/url-test)
    // 包含所有订阅的 Auto 组
    result += `# ${config.name}地区聚合（自动选择，包含所有订阅）\n`
    result += `${regionAggregateName} = url-test, include-other-group="${regionSubGroupsAuto.join(",")}", url=http://www.gstatic.com/generate_204, interval=600, tolerance=100, timeout=5\n`

    // 2. Manual Aggregate (Select)
    // 包含所有订阅的 Manual 组 (作为二级菜单，直接 Select 订阅 Manual 组)
    if (config.hasManualGroup) {
      result += `# ${config.name}地区手动聚合（手动选择，包含所有订阅）\n`
      result += `${regionManualName} = select, ${regionSubGroupsManual.join(",")}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`
    }

    // 保存该地区的所有组列表
    regionAllGroupsMap[regionKey] = regionAllGroups
  }

  // 构建 Vibe-Coding 列表 (按照优化的顺序：聚合在前，然后是细分)
  const vibeCodingFinal: string[] = []
  // 遍历需要加入的地区 (US, SG)
  // 这里我们按照 sortedRegions 的顺序来找
  for (const [regionKey, config] of sortedRegions) {
    if (config.includeInVibeGroup) {
      // 先加聚合
      vibeCodingFinal.push(`${config.emoji} ${config.name}节点`)
      if (config.hasManualGroup) {
        vibeCodingFinal.push(`${config.emoji} ${config.name}-手动`)
      }
      // 再加细分
      kSurgeConfig.forEach(([subName]) => {
        vibeCodingFinal.push(`${config.emoji} ${config.name}-${subName}`)
        // if (config.hasManualGroup) {
        //   vibeCodingFinal.push(`${config.emoji} ${config.name}-${subName}-手动`) // 不再加入 Vibe-Coding
        // }
      })
    }
  }


  // 2. 生成 [Subscription] 全局策略组 & 全局聚合
  const globalSubGroups: string[] = []

  kSurgeConfig.forEach(([subName, subUrl]) => {
    // 命名格式：☁️ SubName-所有节点 (紧凑)
    const globalSubGroupName = `☁️ ${subName}-所有节点`
    globalSubGroups.push(globalSubGroupName)

    result += `# ${subName} 订阅-所有节点\n`
    result += `${globalSubGroupName} = select, policy-path=${subUrl}, update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`
  })

  // 生成全局聚合 "🚀 所有节点"
  // 包含所有订阅的全局组
  result += `\n# 所有节点（聚合所有订阅）\n`
  result += `${allNodesName} = select, include-other-group="${globalSubGroups.join(",")}", update-interval=0, no-alert=0, hidden=0, include-all-proxies=0\n`

  // 3. Vibe-Coding
  if (vibeCodingFinal.length > 0) {
    result += "\n# > 组合策略组\n"
    result += `# 🎧 Vibe-Coding：开发 / 编码场景下常用的外网出海组合（包含聚合与细分）\n`
    result += `🎧 Vibe-Coding = select, ${vibeCodingFinal.join(", ")}\n`
  }

  // 4. 业务分流策略组
  result += "\n# > 业务分流策略组\n"
  const ruleKeys = Object.keys(kRuleSet)
  for (let item of ruleKeys) {
    const rule = (kRuleSet as any)[item]
    if (rule.type === "direct") {
      continue
    }

    const groupName = rule.emoji ? `${rule.emoji} ${item}` : item
    const groups = _buildStandardGroups(allNodesName, rule.excludeHKAndTW || false, true, regionAllGroupsMap, undefined, item)
    result += `${groupName} = select, ${groups.join(", ")}\n`
  }

  // 5. Final
  result += "\n# > 最终策略\n"
  const finalGroups = _buildStandardGroups(allNodesName, false, true, regionAllGroupsMap, undefined, "__final__")
  result += `⚡ Final = select, ${finalGroups.join(", ")}\n\n`

  return result
}

/**
 * 构建解析节点模式的策略组（原有逻辑，用于 /surge.conf 和 /surge_ios.conf）
 * - 🚀 所有节点：所有节点的汇总选择器；
 * - 地区分组（🇭🇰 / 🇯🇵 / 🇹🇼 / 🇸🇬 / 🇺🇸）；
 * - 外网手动/自动入口；
 * - 业务分流组与自定义业务组。
 */
const _buildProxyGroup = (proxyNames: string[]): string => {
  let result = "[Proxy Group]\n"

  // 解析节点模式（原有逻辑，始终使用此模式）
  result += "# > 基础策略组\n"
  result += "# 🚀 所有节点：全局代理选择（手动选择单个节点）\n"
  result += "🚀 所有节点 = select, " + proxyNames.join(", ") + "\n"

  // 所有节点按照地区做一次统一分桶，后续各类策略组（外网 / 业务）统一复用
  const regionBuckets = _bucketProxyByRegion(proxyNames)

  // 按配置顺序生成地区策略组
  const sortedRegions = Object.entries(kRegionConfig).sort((a, b) => a[1].order - b[1].order)
  const regionGroupNames: Record<string, string[]> = {}
  const vibeCodingGroups: string[] = []

  if (proxyNames.length > 0) {
    result += "\n# > 地区策略组\n"
    for (const [regionKey, config] of sortedRegions) {
      const nodes = regionBuckets[regionKey] || []
      if (nodes.length === 0) continue

      // 生成自动策略组（url-test，统一命名：加上"节点"后缀）
      const autoGroupName = `${config.emoji} ${config.name}节点`
      result += `# ${config.name}地区自动选择（url-test，每 600 秒测试一次，选择延迟最低的节点）\n`
      result += `${autoGroupName} = url-test, ${nodes.join(", ")}, url=http://www.gstatic.com/generate_204, interval=600, tolerance=100, timeout=5\n`
      if (!regionGroupNames[regionKey]) regionGroupNames[regionKey] = []
      regionGroupNames[regionKey].push(autoGroupName)

      // 只有新加坡和美国添加到 Vibe-Coding
      if (config.includeInVibeGroup) {
        vibeCodingGroups.push(autoGroupName)
      }

      // 如果配置了手动策略组，也生成
      if (config.hasManualGroup) {
        const manualGroupName = `${config.emoji} ${config.name}-手动`
        result += `# ${config.name}地区手动选择\n`
        result += `${manualGroupName} = select, ${nodes.join(", ")}\n`
        regionGroupNames[regionKey].push(manualGroupName)

        // 只有新加坡和美国的手动策略组添加到 Vibe-Coding
        if (config.includeInVibeGroup) {
          vibeCodingGroups.push(manualGroupName)
        }
      }
    }

    // 🎧 Vibe-Coding：开发 / 编码场景下常用的外网出海组合
    if (vibeCodingGroups.length > 0) {
      result += "\n# > 组合策略组\n"
      result += `# 🎧 Vibe-Coding：开发 / 编码场景下常用的外网出海组合\n`
      result += `🎧 Vibe-Coding = select, ${vibeCodingGroups.join(", ")}\n`
    }
  }

  // 业务分流策略组：基于规则名创建，使用统一的标准配置
  result += "\n# > 业务分流策略组\n"
  const ruleKeys = Object.keys(kRuleSet)
  for (let item of ruleKeys) {
    const rule = (kRuleSet as any)[item]
    if (rule.type === "direct") {
      continue
    }

    // 使用 emoji + 业务名称作为策略组名称
    const groupName = rule.emoji ? `${rule.emoji} ${item}` : item
    // 使用统一的标准配置，根据 excludeHKAndTW 排除台湾和香港
    // 同时根据业务名称对候选顺序做轻微优化（例如 AI / Apple / Final）
    const groups = _buildStandardGroups("🚀 所有节点", rule.excludeHKAndTW || false, false, regionGroupNames, regionBuckets, item)
    result += `${groupName} = select, ${groups.join(", ")}\n`
  }

  // ⚡ Final：兜底策略
  result += "\n# > 最终策略\n"
  if (proxyNames.length > 0) {
    const finalGroups = _buildStandardGroups("🚀 所有节点", false, false, regionGroupNames, regionBuckets, "__final__")
    result += "⚡ Final = select, " + finalGroups.join(", ") + "\n\n"
  } else {
    result += "⚡ Final = select, 🌐 全球直连, 🚀 所有节点, 🎧 Vibe-Coding\n\n"
  }

  return result
}

/**
 * 构建 [Rule] 段
 * - 根据 kLanConfig 决定使用远程 Lan RULE-SET 或本地 CIDR 局域网规则（二选一，避免重复）。
 * - 遍历 kRuleSet，将每个 RULE-SET URL 绑定到对应策略名或 Direct。
 * - 最后拼接自定义 kRules。
 */
const _buildRules = (): string => {
  let result = "[Rule]\n"

  // 1. 自定义业务规则（最高优先级，特殊应用 / 企业内网等）
  // 注意：自定义规则优先级最高，会优先匹配，覆盖其他规则
  if (kCustomRules.length > 0) {
    result += "# > 自定义业务规则（最高优先级）\n"
    result += kCustomRules.join("\n") + "\n"
  }

  // 2. 局域网相关规则：远程 Lan.list 或本地 CIDR 规则（二选一）
  result += "# > 局域网规则\n"
  if (kLanConfig.useRemoteLanRuleSet) {
    result += "# 使用远程 Lan.list 规则集\n"
    result += "RULE-SET, https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Lan/Lan.list, 🌐 全球直连\n"
  } else {
    result += "# 使用本地 CIDR 规则\n"
    result += kLocalLanRules.join("\n") + "\n"
  }

  // 3. 其余规则集（Apple / OpenAI / China 等）
  result += "\n# > 业务规则集（来自 blackmatrix7/ios_rule_script）\n"
  for (let [name, value] of Object.entries(kRuleSet)) {
    // 使用 emoji + 业务名称作为策略组名称（如果配置了 emoji）
    const groupName = value.emoji ? `${value.emoji} ${name}` : name

    for (let url of value.url) {
      if (value.type === "direct") {
        result += `RULE-SET, ${url}, 🌐 全球直连\n`
      }

      if (value.type === "proxy") {
        result += `RULE-SET, ${url}, ${groupName}\n`
      }

    }
  }

  // 4. 追加其余基础规则（例如 FINAL）
  result += "\n# > 基础规则\n"
  result += kRules.join("\n") + "\n"

  result += "\n"
  return result
}

/**
 * 构建 [Host] 段，用于自定义域名解析。
 */
const _buildDNS = (): string => {
  let result = "[Host]\n"

  for (let [domain, ip] of kDNS) {
    result += `${domain} = ${ip}\n`
  }

  return result;
}

/**
 * 构建使用外部节点模式的完整策略组（强制使用外部节点）
 * 用于生成 surge_both.conf 和 surge_ios_both.conf
 * 注意：🌐 全球直连 已在 [Proxy] 段中定义，此处不需要重复定义
 */
const _buildBothProxyGroup = (): string => {
  let result = "[Proxy Group]\n"

  // 构建外部节点策略组
  const externalGroups = _buildExternalProxyGroup(true)
  if (externalGroups) {
    result += externalGroups
  } else {
    // 如果没有配置外部节点，返回基础配置
    result += "⚡ Final = select, 🌐 全球直连\n\n"
  }

  return result
}

// Mac (Surge 6) 使用的托管配置
app.get('/surge.conf', async (c: any) => {
  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge.conf interval=43200 tag=Mac-Surge6-v1\n`
  r += "# app-version = Surge6\n"
  r += _buildSetting(kSettingMac)
  let configs = await downloadConfigs()
  let proxy: Array<[string, string]> = []
  for (let [name, config] of configs) {
    for (let [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value])
    }
  }

  // 构建 Proxy 段并合并扩展配置
  let proxyContent = _buildProxy(proxy).replace("[Proxy]\n", "")
  r += "[Proxy]\n" + _extendedConfig.mergeProxy(proxyContent) + "\n"

  // 构建 Proxy Group 段并合并扩展配置
  let proxyNames = proxy.map((x) => x[0])
  let proxyGroupContent = _buildProxyGroup(proxyNames).replace("[Proxy Group]\n", "")
  r += "[Proxy Group]\n" + _extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n"

  // 构建 Rule 段并合并扩展配置
  let ruleContent = _buildRules().replace("[Rule]\n", "")
  r += "[Rule]\n" + _extendedConfig.mergeRule(ruleContent) + "\n"

  // 构建 Host 段并合并扩展配置
  let hostContent = _buildDNS().replace("[Host]\n", "")
  r += _extendedConfig.mergeHost(hostContent)

  return c.text(r);
})

// iOS (Surge 5) 使用的托管配置，路径单独区分
app.get('/surge_ios.conf', async (c: any) => {
  console.log(`[请求] ${c.req.method} ${c.req.path} (iOS 解析节点模式) - ${c.req.header('User-Agent') || 'Unknown'}`)
  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge_ios.conf interval=43200 tag=iOS-Surge5-v1\n`
  r += "# app-version = Surge5\n"
  r += "# 此配置使用解析节点模式（从订阅下载并解析节点）\n"
  r += _buildSetting(kSettingIOS)
  let configs = await downloadConfigs()
  let proxy: Array<[string, string]> = []
  for (let [name, config] of configs) {
    for (let [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value])
    }
  }

  // 为 iOS 客户端增加一个指向家庭网关 Mac 的代理，便于在家时走旁路网关
  const gatewayHost = getHostFromRequest(c)
  proxy.push(["Home-Gateway", `http, ${gatewayHost}, ${kGatewayHttpPort}`])

  // 构建 Proxy 段并合并扩展配置
  let proxyContent = _buildProxy(proxy).replace("[Proxy]\n", "")
  r += "[Proxy]\n" + _extendedConfig.mergeProxy(proxyContent) + "\n"

  // 构建 Proxy Group 段并合并扩展配置
  let proxyNames = proxy.map((x) => x[0])
  let proxyGroupContent = _buildProxyGroup(proxyNames).replace("[Proxy Group]\n", "")
  r += "[Proxy Group]\n" + _extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n"

  // 构建 Rule 段并合并扩展配置
  let ruleContent = _buildRules().replace("[Rule]\n", "")
  r += "[Rule]\n" + _extendedConfig.mergeRule(ruleContent) + "\n"

  // 构建 Host 段并合并扩展配置
  let hostContent = _buildDNS().replace("[Host]\n", "")
  r += _extendedConfig.mergeHost(hostContent)

  return c.text(r);
})

/**
 * 扩展配置工具函数
 * 统一封装 kExtendedConfig 的处理逻辑，减少重复代码
 */
const _extendedConfig = {
  /**
   * 获取扩展配置中指定段的内容
   * @param section 配置段名称（如 "Proxy", "Proxy Group", "Rule", "Host"）
   * @returns 配置内容（已去除首尾空白），如果不存在则返回空字符串
   */
  get(section: string): string {
    return kExtendedConfig[section]?.trim() || ""
  },

  /**
   * 合并扩展配置到指定段
   * @param section 配置段名称
   * @param mainContent 主配置段内容（不包含段标题）
   * @param comment 扩展配置的注释（可选）
   * @returns 合并后的配置段内容
   */
  merge(section: string, mainContent: string, comment?: string): string {
    const extended = this.get(section)
    if (!extended) {
      return mainContent
    }

    let result = mainContent
    if (comment) {
      result += `\n\n# ========== ${comment} ==========\n`
    } else {
      result += "\n\n# ========== 扩展配置 ==========\n"
    }
    result += extended
    return result
  },

  /**
   * 合并扩展配置到 Proxy 段
   */
  mergeProxy(mainContent: string): string {
    return this.merge("Proxy", mainContent)
  },

  /**
   * 合并扩展配置到 Proxy Group 段
   */
  mergeProxyGroup(mainContent: string): string {
    return this.merge("Proxy Group", mainContent, "扩展配置")
  },

  /**
   * 合并扩展配置到 Rule 段
   */
  mergeRule(mainContent: string): string {
    return this.merge("Rule", mainContent, "扩展规则")
  },

  /**
   * 合并扩展配置到 Host 段
   */
  mergeHost(mainContent: string): string {
    return this.merge("Host", mainContent, "扩展 Host")
  }
}

/**
 * 构建扩展配置：在主配置基础上添加额外的配置段
 * @param baseConfig 基础配置的完整内容
 * @returns 包含扩展配置的完整配置
 */
const _buildExtendedConfig = (baseConfig: string): string => {
  let extended = baseConfig.trim()

  // 如果定义了扩展配置，追加到配置末尾
  if (Object.keys(kExtendedConfig).length > 0) {
    extended += "\n\n# ========== 扩展配置 ==========\n"

    // 按配置段顺序追加
    const sectionOrder = ["Proxy", "Proxy Group", "Rule", "Host"]

    for (const section of sectionOrder) {
      const content = _extendedConfig.get(section)
      if (content) {
        extended += `\n[${section}]\n${content}\n`
      }
    }

    // 处理其他未在标准顺序中的配置段
    for (const [section, content] of Object.entries(kExtendedConfig)) {
      if (!sectionOrder.includes(section) && content && content.trim()) {
        extended += `\n[${section}]\n${content.trim()}\n`
      }
    }
  }

  return extended
}

// Mac (Surge 6) 扩展配置：包含完整主配置 + 扩展配置区域，支持在 Surge 客户端中直接编辑
app.get('/surge_extended.conf', async (c: any) => {
  // 先构建完整的主配置内容
  let baseConfig = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge_extended.conf interval=43200 tag=Mac-Surge6-Extended-v1\n`
  baseConfig += "# app-version = Surge6\n"
  baseConfig += "# ========== 扩展配置说明 ==========\n"
  baseConfig += "# 此配置包含完整的主配置内容，主配置更新时会自动同步\n"
  baseConfig += `# 主配置地址：http://${env.HOSTNAME}:${env.PORT}/surge.conf\n`
  baseConfig += "# 你可以在下方「自定义配置区域」添加自定义配置\n"
  baseConfig += "# 注意：由于是托管配置，手动添加的内容在配置更新时可能会被覆盖\n"
  baseConfig += "# 建议将自定义配置添加到 src/config.ts 的 kExtendedConfig 中\n"
  baseConfig += "# ====================================\n\n"

  baseConfig += _buildSetting(kSettingMac)
  let configs = await downloadConfigs()
  let proxy: Array<[string, string]> = []
  for (let [name, config] of configs) {
    for (let [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value])
    }
  }

  baseConfig += _buildProxy(proxy)
  let proxyNames = proxy.map((x) => x[0])
  baseConfig += _buildProxyGroup(proxyNames)
  baseConfig += _buildRules()
  baseConfig += _buildDNS()

  // 添加扩展配置区域（用户可以在 Surge 客户端中编辑）
  baseConfig += "\n# ========== 自定义配置区域 ==========\n"
  baseConfig += "# 以下区域可以添加自定义配置，这些配置会与主配置合并\n"
  baseConfig += "# 支持的配置段：\n"
  baseConfig += "# - [Proxy]：添加自定义代理节点\n"
  baseConfig += "# - [Proxy Group]：添加自定义策略组\n"
  baseConfig += "# - [Rule]：添加自定义规则\n"
  baseConfig += "# - [Host]：添加自定义域名解析\n"
  baseConfig += "# ====================================\n\n"

  // 如果代码中定义了扩展配置，添加进去
  const extendedConfig = _buildExtendedConfig(baseConfig)
  return c.text(extendedConfig);
})

// iOS (Surge 5) 扩展配置：包含完整主配置 + 扩展配置区域，支持在 Surge 客户端中直接编辑
app.get('/surge_ios_extended.conf', async (c: any) => {
  // 先构建完整的主配置内容
  let baseConfig = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge_ios_extended.conf interval=43200 tag=iOS-Surge5-Extended-v1\n`
  baseConfig += "# app-version = Surge5\n"
  baseConfig += "# ========== 扩展配置说明 ==========\n"
  baseConfig += "# 此配置包含完整的主配置内容，主配置更新时会自动同步\n"
  baseConfig += `# 主配置地址：http://${env.HOSTNAME}:${env.PORT}/surge_ios.conf\n`
  baseConfig += "# 你可以在下方「自定义配置区域」添加自定义配置\n"
  baseConfig += "# 注意：由于是托管配置，手动添加的内容在配置更新时可能会被覆盖\n"
  baseConfig += "# 建议将自定义配置添加到 src/config.ts 的 kExtendedConfig 中\n"
  baseConfig += "# ====================================\n\n"

  baseConfig += _buildSetting(kSettingIOS)
  let configs = await downloadConfigs()
  let proxy: Array<[string, string]> = []
  for (let [name, config] of configs) {
    for (let [key, value] of Object.entries(config)) {
      proxy.push([`${name}-${key}`, value])
    }
  }

  // 为 iOS 客户端增加一个指向家庭网关 Mac 的代理
  const gatewayHost = getHostFromRequest(c)
  proxy.push(["Home-Gateway", `http, ${gatewayHost}, ${kGatewayHttpPort}`])

  baseConfig += _buildProxy(proxy)
  let proxyNames = proxy.map((x) => x[0])
  baseConfig += _buildProxyGroup(proxyNames)
  baseConfig += _buildRules()
  baseConfig += _buildDNS()

  // 添加扩展配置区域（用户可以在 Surge 客户端中编辑）
  baseConfig += "\n# ========== 自定义配置区域 ==========\n"
  baseConfig += "# 以下区域可以添加自定义配置，这些配置会与主配置合并\n"
  baseConfig += "# 支持的配置段：\n"
  baseConfig += "# - [Proxy]：添加自定义代理节点\n"
  baseConfig += "# - [Proxy Group]：添加自定义策略组\n"
  baseConfig += "# - [Rule]：添加自定义规则\n"
  baseConfig += "# - [Host]：添加自定义域名解析\n"
  baseConfig += "# ====================================\n\n"

  // 如果代码中定义了扩展配置，添加进去
  const extendedConfig = _buildExtendedConfig(baseConfig)
  return c.text(extendedConfig);
})

// Mac (Surge 6) 使用外部节点模式的配置（smart 策略组，支持自动更新）
app.get('/surge_both.conf', async (c: any) => {
  console.log(`[请求] ${c.req.method} ${c.req.path} (Mac 外部节点模式) - ${c.req.header('User-Agent') || 'Unknown'}`)
  // 检查是否配置了订阅
  if (kSurgeConfig.length === 0) {
    console.error(`[错误] /surge_both.conf 未配置订阅`)
    return c.text("# 错误：未配置订阅，请在 src/config.ts 中配置 kSurgeConfig（第一个配置将用于外部节点模式）", 400)
  }

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge_both.conf interval=43200 tag=Mac-Surge6-Smart-v1\n`
  r += "# app-version = Surge6\n"
  r += "# 此配置使用外部节点模式（smart 策略组），支持自动更新\n"
  r += _buildSetting(kSettingMac)

  // 外部节点模式不需要下载和解析节点，直接使用 policy-path
  r += "[Proxy]\n"
  let proxyContent = "🌐 全球直连 = direct"
  r += _extendedConfig.mergeProxy(proxyContent) + "\n\n"

  let proxyGroupContent = _buildBothProxyGroup().replace("[Proxy Group]\n", "")
  r += "[Proxy Group]\n" + _extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n"

  let ruleContent = _buildRules().replace("[Rule]\n", "")
  r += "[Rule]\n" + _extendedConfig.mergeRule(ruleContent) + "\n"

  let hostContent = _buildDNS().replace("[Host]\n", "")
  r += _extendedConfig.mergeHost(hostContent)

  return c.text(r);
})

// iOS (Surge 5) 使用外部节点模式的配置（smart 策略组，支持自动更新）
app.get('/surge_ios_both.conf', async (c: any) => {
  console.log(`[请求] ${c.req.method} ${c.req.path} (iOS 外部节点模式) - ${c.req.header('User-Agent') || 'Unknown'}`)
  // 检查是否配置了订阅
  if (kSurgeConfig.length === 0) {
    console.error(`[错误] /surge_ios_both.conf 未配置订阅`)
    return c.text("# 错误：未配置订阅，请在 src/config.ts 中配置 kSurgeConfig（第一个配置将用于外部节点模式）", 400)
  }

  let r = `#!MANAGED-CONFIG http://${env.HOSTNAME}:${env.PORT}/surge_ios_both.conf interval=43200 tag=iOS-Surge5-Smart-v1\n`
  r += "# app-version = Surge5\n"
  r += "# 此配置使用外部节点模式（smart 策略组），支持自动更新\n"
  r += "# 节点通过 policy-path 自动从订阅更新，无需重新生成配置\n"
  r += _buildSetting(kSettingIOS)

  // 外部节点模式不需要下载和解析节点，直接使用 policy-path
  r += "[Proxy]\n"
  // 为 iOS 客户端增加一个指向家庭网关 Mac 的代理
  const gatewayHost = getHostFromRequest(c)
  let proxyContent = `🌐 全球直连 = direct\nHome-Gateway = http, ${gatewayHost}, ${kGatewayHttpPort}`
  r += _extendedConfig.mergeProxy(proxyContent) + "\n\n"

  let proxyGroupContent = _buildBothProxyGroup().replace("[Proxy Group]\n", "")
  r += "[Proxy Group]\n" + _extendedConfig.mergeProxyGroup(proxyGroupContent) + "\n"

  let ruleContent = _buildRules().replace("[Rule]\n", "")
  r += "[Rule]\n" + _extendedConfig.mergeRule(ruleContent) + "\n"

  let hostContent = _buildDNS().replace("[Host]\n", "")
  r += _extendedConfig.mergeHost(hostContent)

  return c.text(r);
})

const port = parseInt(env.PORT || '3000')
const hostname = env.HOSTNAME || '0.0.0.0'

// 获取局域网 IP
import { networkInterfaces } from 'os'
const getLanIP = (): string | undefined => {
  const nets = networkInterfaces()
  for (const name of ['en0', 'en1', 'eth0', 'wlan0']) {
    const net = nets[name]?.find(n => 
      n.family === 'IPv4' && 
      !n.internal && 
      !n.address.startsWith('169.254.')  // 跳过 APIPA 地址
    )
    if (net) return net.address
  }
  return undefined
}
const lanIP = getLanIP()
const localHost = '127.0.0.1'

console.log(`\n🚀 Surge 配置生成服务启动成功`)
console.log(`📡 监听地址: ${hostname}:${port}`)

console.log(`\n📋 可用端点 (本机访问):`)
console.log(`   http://${localHost}:${port}/profile/mac`)
console.log(`   http://${localHost}:${port}/profile/ios`)
console.log(`   http://${localHost}:${port}/provider/mac`)
console.log(`   http://${localHost}:${port}/provider/ios`)

if (lanIP) {
  console.log(`\n📋 可用端点 (局域网访问):`)
  console.log(`   http://${lanIP}:${port}/profile/mac`)
  console.log(`   http://${lanIP}:${port}/profile/ios`)
  console.log(`   http://${lanIP}:${port}/provider/mac`)
  console.log(`   http://${lanIP}:${port}/provider/ios`)
}

if (kSurgeConfig.length > 0) {
  console.log(`\n✅ 已配置 ${kSurgeConfig.length} 个订阅源`)
} else {
  console.log(`\n⚠️  订阅未配置，请在 src/secrets.ts 中配置 kSubscriptions`)
}
console.log(`\n`)

export default {
  port,
  fetch: app.fetch,
  hostname
} 
