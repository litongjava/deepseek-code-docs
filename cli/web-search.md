# 联网搜索与深度研究

模型用两个工具访问网络：`WebSearch` 搜索网页，`WebFetch` 读取一个网页。`/deep-research` 在此基础上做多角度的联网研究，并核实结论。

## 配置联网搜索

`WebSearch` 支持独立配置搜索服务（支持 **DeepSeek**、**OpenAI** 和 **Anthropic**，也支持自定义 HTTP(S) 网关），和 Desktop 的"系统设置 → 联网搜索"共用同一份配置。若 `base_url`、`model` 或 `api_key` 任一缺失，交互式 `dcl` 启动横幅下方会显示一条 `System Reminder` 提示运行 `/search-config`，Desktop 顶部也会显示可关闭的 `System Reminder` 横幅并提供直达设置页的 `Configure` 按钮。

### 交互式向导（推荐）

在会话中运行 `/search-config` 或 `/config search`（也可在 `/config` 面板的 `Config` 页选择 `Web search`），按三步向导完成配置：

1. **选择提供商或直接输入 URL**：可选择 `1. DeepSeek`、`2. OpenAI`、`3. Anthropic`、`4. Custom URL`，或直接粘贴 `http(s)://` 地址（不区分协议大小写）；回车保留当前项。
2. **输入 API Key**：隐藏输入；回车保留当前密钥，输入 `clear` 清除。
3. **选择模型**：按所选提供商提供常用模型预设，也可输入任意自定义模型 ID；回车保留默认/当前模型。

也支持一行快捷命令：

```text
/config search provider deepseek|openai|anthropic
/config search api_key sk-...
/config search base_url https://api.deepseek.com/anthropic/v1
/config search model deepseek-flash
/config search clear
```

### 命令行配置

```bash
dcl config set search.provider deepseek   # 可选：deepseek | openai | anthropic
dcl config set search.api_key sk-...
# 以下两项可选，DeepSeek 默认值如下
dcl config set search.base_url https://api.deepseek.com/anthropic/v1
dcl config set search.model deepseek-flash
```

- 配置保存在[数据目录](./data-directory.md)的 `config/config.json` 中（`deepseek_search`），`dcl config show` 显示时密钥会被隐藏。未设置 `provider` 的旧配置按端点自动识别（`api.openai.com` → OpenAI、`api.anthropic.com` → Anthropic，其余保持 DeepSeek 路由），完全向后兼容。
- 对话用的 API Key 不会被拿来代替独立搜索密钥。没有配置时，若保持默认且当前会话本身是 DeepSeek，会按规则提示或使用对应策略；否则 `WebSearch` 返回配置说明，模型会转告你，而不会假装搜索成功。
- 每次搜索时实时读取配置，修改后不需要重启。搜索请求只包含查询词，不包含对话内容。
- 不同提供商按各自原生搜索协议发送请求：DeepSeek 与 Anthropic 走 Messages API（`web_search_20250305`），OpenAI 走 Responses API（`web_search`）；兼容代理需要完整支持相应的原生搜索请求与结果。

## 通过代理使用原生搜索

Responses 搜索使用消息数组形式的 `input`，携带 `web_search` 工具和来源引用选项，可用于 Codex 原生入口。模型能够对话与代理完整支持搜索是两个独立条件。

代理将上游 SSE 转为普通 JSON 时，需要保留 `response.output_item.done` 中的搜索结果和引用；有些响应的最后一个 `response.completed` 事件不再重复这些项目。正常结果应包含已完成的 `web_search_call` 和结构化来源。只有 HTTP 200 或搜索次数统计，不能作为已取得来源的依据。

遇到 HTTP 400 时可查看代理的具体错误。例如 `Input must be a list` 表示输入需要消息数组，不能据此判断模型不支持搜索。若响应成功但没有来源，应继续检查代理的结果聚合。

## WebSearch

参数：`query`，可选 `allowed_domains`、`blocked_domains`。和 Claude Code 一样，用这两个列表只保留或排除某些网站的结果。终端里显示为：

```text
● Web Search("rust 2024 edition")
```

模型回答后会在末尾列出 `Sources:` 来源链接。

## WebFetch

参数：`url`、`prompt`，可选 `offset`。`WebFetch` 先将网页转为清洁文本：

- **短页直返（≤ 20,000 字符）**：直接返回清洁后的正文，不再额外调用模型做摘要，响应更快且无信息折损。
- **长页摘要（> 20,000 字符）**：使用当前会话的模型按 `prompt` 回答（8,192 token 输出预算，默认关闭深度思考；若上游 HTTP 400/422 拒绝关闭思考参数，自动按会话原思考设置重试一次）。若摘要仍超输出上限或为空，自动优雅降级返回前 20,000 字符并附带 `next_offset`，模型可继续分段读取。

终端里显示为 `Fetch(https://...)`。网页文本中的长 Base64 数据会先折叠为一行占位符。需要原始响应正文时，可通过 `Bash` 运行 `curl -o page.html https://example.com/`。

- **缓存与超时**：同一个 URL 15 分钟内重复读取直接使用缓存；单次抓取上限 2 MiB，请求超时 **30 秒**（建连超时 **10 秒**），Jina Reader 兜底超时 **30 秒**。
- **协议与重定向**：公网 `http://` 自动升级为 `https://`；自动跟随同主机及跨主机公网重定向（最多 10 跳），但严格拦截公网跳转到本机/内网地址（防 SSRF）。仅支持 HTTP/HTTPS，`file://`、`ftp://` 等协议继续拒绝。
- **Jina Reader 自动兜底**：访问公网页面遇到网络错误、HTTP 401/403/406/429/5xx，或抓到明显的 JS 空壳页（HTML ≥ 1 KiB 但提取正文 < 200 字符）时，自动通过 `https://r.jina.ai/<url>` 补抓。本机/内网地址、`raw` 原始读取、带自定义请求头或目标本身已是 `r.jina.ai` 时不触发。
- **HTTP 代理配置**：可在 `config/config.json` 中单独配置 `web_fetch.proxy`（仅支持 `http://` 与 `https://`，每次调用实时生效无需重启），未配置时沿用环境变量 `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`；访问本机/回环/内网地址时始终绕过代理：
  ```bash
  dcl config set fetch.proxy http://127.0.0.1:10808
  dcl config set fetch.proxy ""    # 清除代理
  ```
  也可在交互界面通过 `/config fetch-proxy` 或 `/config` 面板的 `Web fetch proxy` 项设置。
- **本机与内网审批**：`localhost`、回环、内网、链路本地地址和不带点的主机名在 ask、Plan 和 Auto 等模式下会在访问前请求本次审批；需要审批而未获授权时不会发送请求。bypass 模式允许直接访问这些地址，显式 deny 规则仍适用。访问本机服务时保留原始 HTTP/HTTPS 协议，一次批准不授权下一次请求。
- 页面较长时分段读取：结果带有 `next_offset` 时，用它作为 `offset` 继续读。
- 需要登录的私有页面会失败，请改用有认证的 MCP 工具或 `gh` 等命令。

新域名的审批还取决于权限模式和域名规则，见[访问新网站](./permissions.md#访问新网站)。

## /deep-research

```text
/skills state deep-research user-only
/deep-research Rust 2024 edition 有哪些不兼容的变化？
```

`/deep-research` 是内置的研究工作流，只在你明确调用时运行：

1. 把问题拆成 3–6 个研究角度；
2. 每个角度由子代理并行搜索、读取网页、摘录证据；
3. 对每条结论，由多个子代理对照抓取到的原文投票核实，引用的原文必须能在来源中找到；
4. 汇总成报告：摘要、每条发现的可信度和来源、注意事项、未解决的问题，以及来源数、重复 URL、失败的子任务等统计。

- 研究子代理可以访问任何网页，不逐个询问（这是你明确发起的联网研究），deny 规则对它们仍然有效。
- 需要先[配置联网搜索](#配置联网搜索)；没有配置时会在搜索阶段停止并说明原因。
- 核实投票基于抓取到的证据，不能保证结论绝对正确，报告里也会注明这一点。
