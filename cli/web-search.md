# 联网搜索与深度研究

模型用两个工具访问网络：`WebSearch` 搜索网页，`WebFetch` 读取一个网页。`/deep-research` 在此基础上做多角度的联网研究，并核实结论。

## 配置 DeepSeek 联网搜索

使用 DeepSeek 模型时，`WebSearch` 走一个**独立的搜索服务**，需要单独配置密钥，和 Desktop 的"系统设置 → 联网搜索"是同一份配置：

```bash
dcl config set search.api_key sk-...
# 以下两项可选，默认值如注释
dcl config set search.base_url https://api.deepseek.com/anthropic/v1
dcl config set search.model deepseek-flash
```

- 配置保存在[数据目录](./data-directory.md)的 `config.json` 中（`deepseek_search`），`dcl config show` 显示时密钥会被隐藏。
- 对话用的 API Key 不会被拿来代替搜索密钥。没有配置时，`WebSearch` 返回配置说明，模型会转告你，而不会假装搜索成功。
- 每次搜索时读取配置，修改后不需要重启。搜索请求只包含查询词，不包含对话内容。
- 其他提供商（OpenAI、Anthropic）使用它们接口自带的搜索，不需要这一步。

## WebSearch

参数：`query`，可选 `allowed_domains`、`blocked_domains`。和 Claude Code 一样，用这两个列表只保留或排除某些网站的结果。终端里显示为：

```text
● Web Search("rust 2024 edition")
```

模型回答后会在末尾列出 `Sources:` 来源链接。

## WebFetch

参数：`url`、`prompt`，可选 `offset`。和 Claude Code 一样，WebFetch 不把整页内容交给模型，而是把网页转成文本后，用当前会话的模型按 `prompt` 回答，再把回答返回。终端里显示为 `Fetch(https://...)`。

- 同一个 URL 15 分钟内重复读取时直接使用缓存。
- `http://` 自动升级为 `https://`。
- 拒绝 `localhost`、内网地址和不带点的主机名；本地服务请让模型用 `curl`。
- 跳转到其他主机时不自动跟随，而是把跳转地址返回给模型，由它决定是否再次读取；同一主机内的跳转照常跟随。
- 页面较长时分段读取：结果带有 `next_offset` 时，用它作为 `offset` 继续读。
- 需要登录的私有页面会失败，请改用有认证的 MCP 工具或 `gh` 等命令。

访问新的网站前会请你确认，常见文档站点除外，见[访问新网站](./permissions.md#访问新网站)。

## /deep-research

```text
/deep-research Rust 2024 edition 有哪些不兼容的变化？
```

`/deep-research` 是内置的研究工作流，只在你明确调用时运行：

1. 把问题拆成 3–6 个研究角度；
2. 每个角度由子代理并行搜索、读取网页、摘录证据；
3. 对每条结论，由多个子代理对照抓取到的原文投票核实，引用的原文必须能在来源中找到；
4. 汇总成报告：摘要、每条发现的可信度和来源、注意事项、未解决的问题，以及来源数、重复 URL、失败的子任务等统计。

- 研究子代理可以访问任何网页，不逐个询问（这是你明确发起的联网研究），deny 规则对它们仍然有效。
- 需要先[配置联网搜索](#配置-deepseek-联网搜索)；没有配置时会在搜索阶段停止并说明原因。
- 核实投票基于抓取到的证据，不能保证结论绝对正确，报告里也会注明这一点。
