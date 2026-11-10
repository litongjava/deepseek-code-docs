# 接入 OpenCode Go

[OpenCode Go](https://opencode.ai/auth) 是一个模型聚合网关，一个 Key 可以调用 DeepSeek、GLM、Kimi、Grok、GPT、Claude、Gemini 等多家模型。它的模型分属四种协议，dcl 按所选模型自动切换协议和接口地址，不需要为每个协议单独建一个提供商。

## 准备 Key

1. 打开 <https://opencode.ai/auth> 创建 API Key。
2. 在启动 dcl 的终端里设置环境变量：

```bash
export OPENCODE_API_KEY=oc_sk_...
```

Windows 使用 `setx OPENCODE_API_KEY "oc_sk_..."`，设置后需要打开新的终端。也可以不设环境变量，在引导流程里直接粘贴 Key，Key 会保存在数据目录的 `config.json`，只有当前用户可读。

## 首次启动选择 OpenCode Go

第一次运行 `dcl` 时，在提供商列表中选择 `8`：

```text
   7. Alibaba Qwen Token Plan (China)
   8. OpenCode Go
   9. OpenRouter
  10. Another OpenAI- or Anthropic-compatible endpoint
Number or saved provider ID [1]: 8
Using the API key from OPENCODE_API_KEY.
 Choose the model to use
 Change it later with /model
 ⌕ Search…
 ❯ deepseek-v4.1-flash
   DeepSeek V4.1 Flash
   deepseek-v4-pro
   DeepSeek V4 Pro
   …
 Enter to confirm · Esc for the first
```

流程是：

1. **读取 Key**：环境变量已设置时显示 `Using the API key from OPENCODE_API_KEY.`，不会再次询问；否则提示 `Get an API key at https://opencode.ai/auth`，粘贴时只显示圆点。
2. **选择模型**：列出内置目录里的全部模型（当前 31 个），显示模型 ID 和名称。用方向键选择，也可以直接输入关键字筛选，例如输入 `grok` 只保留 `grok-4.7`。`Enter` 确认，`Esc` 取第一个。
3. **检查连接**：保存后立刻用**所选模型**发一个很小的请求，显示 `Checking the connection with <模型>…`。
4. **完成**：成功时显示 `Connected. OpenCode Go is saved as the default provider.`，该模型成为新会话的默认模型，之后可用 `/model` 修改。

## 在会话里重新接入

```text
❯ /provider add opencode-go
```

带预设 ID 时直接进入上面的流程，不经过通用向导：先读取 Key，再列出全部模型，选择后只用所选模型做连接测试。

## 用 `/provider add` 手填地址

也可以按通用向导添加。输入 `https://opencode.ai/v1` 时，dcl 会识别出这是 OpenCode 的主机而不是接口地址，自动改成对应协议的地址并给出提示：

```text
Base URL: https://opencode.ai/v1
  OpenCode Go serves this protocol at https://opencode.ai/inference/go/openai/v1; using that URL.
  For every OpenCode model and protocol, choose the OpenCode Go preset (/provider add opencode-go).
API key, or environment variable name (key:<key> forces a literal key) [OPENCODE_API_KEY]:
```

地址含 `opencode.ai` 时，Key 一栏默认建议 `OPENCODE_API_KEY`，直接回车即可。纠正后的地址按所选协议决定：

- `openai`、`responses` → `https://opencode.ai/inference/go/openai/v1`
- `anthropic` → `https://opencode.ai/inference/go/anthropic/v1`
- `gemini` → `https://opencode.ai/inference/go/google/v1beta`

手填地址只能得到当前协议下的模型列表。要一次拿到全部模型和四种协议，请使用预设 `/provider add opencode-go`。

## 四种协议与地址

每个模型在内置目录里记录了自己的协议和接口地址，dcl 发送时按模型选择：

- `chat-completions` 对应 `openai-completions`，地址 `https://opencode.ai/inference/go/openai/v1`，请求发往 `/chat/completions`
- `responses` 对应 `openai-responses`，地址同上，请求发往 `/responses`
- `messages` 对应 `anthropic-messages`，地址 `https://opencode.ai/inference/go/anthropic/v1`，请求发往 `/messages`
- `generate-content` 对应 `google-generative-ai`，地址 `https://opencode.ai/inference/go/google/v1beta`

常用的代表模型：

- chat：`deepseek-v4.1-flash`、`deepseek-v4-pro`、`glm-5.3`、`kimi-k3`
- responses：`grok-4.7`、`gpt-6-luna`、`muse-spark-1.3-contributor`
- messages：`minimax-m3`、`claude-haiku-5-5`、`qwen3.8-max`
- Gemini：`gemini-4-argon`

## 会话头 `x-opencode-session`

OpenCode 要求每个请求带一个稳定的会话标识，用于路由和 prompt cache。dcl 对 OpenCode 的请求统一发送 `x-opencode-session`：

- 会话内请求的值是会话 ID，同一对话的每次请求都相同；
- 连接测试等会话外请求回退为请求 ID，保证这个头始终存在；
- 其他供应商不会收到这个头，也不会收到通用的 `x-session-id`、`session-id`、`thread-id`。

如果缺少这个头，上游会返回 `400 MissingSessionID`。正常使用 dcl 不会遇到；出现时应视为版本问题，先升级 dcl。

## 常见错误

### 模型在所在地区不可用

```text
The connection test failed: Model API error 403: service reported an error: model unavailable in this region (regionerror)
oc-custom is saved; fix it with /provider edit oc-custom.
beam-free is not available in this region; pick another model with /provider edit oc-custom.
```

网关的模型列表对所有地区可见，但部分模型（例如免费模型）只在特定地区开放。这不是地址或 Key 的问题，换一个可用模型即可：

```text
❯ /provider edit oc-custom
```

把模型改成 `deepseek-v4.1-flash` 这类可用模型后会显示 `Connected with deepseek-v4.1-flash.`。OpenAI 系模型也可能返回 `unsupported_country_region_territory`，同样属于上游地区限制。

### 地址返回的是网页

```text
Could not list models: The endpoint answered 404 Not Found with a web page, not an API response; check that the Base URL is the API base (it usually ends in /v1).
  Check the Base URL and key, or /cancel and run /provider add again.
```

说明 Base URL 填成了网站地址而不是接口地址。OpenCode 请使用 `https://opencode.ai/inference/go/openai/v1`，或者直接用 `/provider add opencode-go` 预设。dcl 不会把网页源码打印到终端。

### 连接测试失败但提供商已保存

`/provider add` 保存后立即测试连接。失败时不会丢弃刚保存的提供商：

```text
The connection test failed: …
oc-custom is saved; fix it with /provider edit oc-custom.
```

用 `/provider edit <ID>` 修正地址、Key 或模型，不需要重新添加。只有 Key 来自环境变量且当前终端没有设置时才会跳过测试，此时会提示先设置变量。

## 手工编辑 `config.json`

预设保存的提供商 `base_url` 为空，由目录按模型提供地址；`settings.builtinId` 必须为 `opencode-go`，否则运行时找不到目录条目：

```json
{
  "providers": [
    {
      "id": "opencode-go",
      "name": "OpenCode Go",
      "provider_type": "openai",
      "api_key": null,
      "base_url": "",
      "models": [
        {
          "id": "deepseek-v4.1-flash",
          "name": "DeepSeek V4.1 Flash",
          "enabled": true,
          "max_tokens": 32000,
          "supports_vision": true,
          "supports_text": true,
          "supports_tools": true,
          "supports_streaming": true,
          "context_window": 1000000,
          "api": "openai-completions"
        },
        {
          "id": "gemini-4-argon",
          "name": "Gemini 4 Argon",
          "enabled": true,
          "max_tokens": 65536,
          "supports_vision": true,
          "supports_text": true,
          "supports_tools": true,
          "supports_streaming": true,
          "context_window": 1048576,
          "api": "google-generative-ai"
        }
      ],
      "enabled": true,
      "is_default": true,
      "settings": {
        "apiKeyEnv": "OPENCODE_API_KEY",
        "builtinId": "opencode-go"
      }
    }
  ],
  "default_provider_id": "opencode-go"
}
```

`models[].api` 决定协议，取值与上面的四种协议对应。字段含义见[模型与提供商](./providers.md#手工编辑-config-json)。

## 维护内置目录

`opencode-go` 的模型、协议和地址来自 `src/data/providerCatalog.json`，Desktop 与 dcl 共用这份目录。上游模型有变动时，用 Key 重新同步：

```bash
node scripts/sync-opencode-go-catalog.mjs
```

脚本只改写 `opencode-go` 这一个条目，Key 只在内存中使用。重新运行 `scripts/import-provider-catalog.mjs` 会覆盖该条目，之后必须再执行一次同步脚本。

## 相关文档

- [首次启动与内置提供商](./first-run.md)
- [模型与提供商](./providers.md)
- [故障排查](./troubleshooting.md)
- [状态查看](./status.md)
