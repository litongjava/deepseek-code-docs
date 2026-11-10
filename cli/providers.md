# 模型与提供商

**提供商**（provider）是一组连接信息：协议、接口地址、凭据（Key 本身或保存 Key 的环境变量），以及可用的模型列表。dcl 有三种使用方式：

| 方式 | 特点 |
|---|---|
| **临时提供商** | 用命令行参数或环境变量启动，例如 `-m deepseek-flash` 配合 `DEEPSEEK_API_KEY`。不写入配置，`/model` 列不出模型 |
| **内置提供商** | 第一次启动时从列表中选择，粘贴 API Key 即可，见[首次启动与内置提供商](./first-run.md) |
| **保存的提供商** | 用 `/provider add` 保存到数据目录，之后可以用 `/provider`、`/model` 随时切换，Desktop 也能看到 |

## 同时保存多个提供商

保存的提供商是一个列表，可以同时存在多个，彼此独立：每个提供商各自记录协议、接口地址、凭据来源和模型列表，用 `/provider` 切换，切换后对话历史保留。

常见用法：

- 官方接口和代理地址各存一个，网络不通时换一个；
- 国内、国外线路分开保存，出差时不用改配置；
- 本地推理服务和云端接口并存，简单任务走本地模型；
- 同一家厂商的测试 Key 和正式 Key 分开保存。

不同提供商可以包含相同的模型 ID。dcl 发送请求时同时带上提供商和模型，不会把请求发到另一家的地址，也不会用错 Key。启动时需要同时写清楚，用 `provider::model`：

```bash
dcl -m openrouter::anthropic/claude-sonnet-4.5
```

只写模型 ID 而它在多个提供商下都存在时，dcl 会提示：

```text
Model exists in several providers; select --provider or provider::model
```

提供商保存在数据目录下的 `config.json`，与 Desktop 共用。Desktop 里添加的供应商，dcl 执行 `/provider` 时同样会列出来。

## 保存一个提供商：`/provider add`

在交互模式里运行 `/provider add`，按提示逐项填写：

```text
❯ /provider add
Provider setup; /cancel cancels. Enter an API key directly, or the NAME of an environment variable that holds it.
Provider ID: llm-proxy
Protocol:
  1. openai — OpenAI Chat Completions-compatible endpoints
  2. anthropic — Claude and Anthropic-compatible endpoints
  3. gemini — Google Gemini
  4. responses — OpenAI Responses-compatible endpoints
Protocol (1-4) [1]: 1
Base URL: http://127.0.0.1:8318/v1
API key, or environment variable name (key:<key> forces a literal key): 123456
  The key will be saved in config.json, readable only by you.
  Listing models from http://127.0.0.1:8318/v1…
Models available from http://127.0.0.1:8318/v1:
   1. deepseek-chat
   2. deepseek-reasoner
   3. qwen3-coder
Model numbers (comma separated; first is default, all for every model) [1]: 1,3
Saved llm-proxy (2 models); the API key is stored in config.json (readable only by you).
Switch this session to llm-proxy now? [Y/n]:
```

各项的含义和校验规则：

| 项目 | 说明 |
|---|---|
| Provider ID | 字母、数字、`-`、`_`，例如 `deepseek` |
| Protocol | 输入 `1`、`2`、`3`、`4` 选择 `openai`、`anthropic`、`gemini` 或 `responses`；直接回车选 `1`。也可以直接输入协议名 |
| Base URL | `http://` 或 `https://` 开头，不能包含账号密码、查询参数或片段。DeepSeek 选择 Anthropic 协议时自动补成 `/anthropic`；OpenCode 的网站地址会自动改成对应协议的接口地址 |
| API Key / 环境变量名 | 可以直接粘贴 Key，也可以填保存 Key 的**环境变量名**。全大写的名字（如 `DEEPSEEK_API_KEY`）按变量名处理，其余输入（如 `123456`、`sk-...`）按 Key 直接保存；有歧义时用 `key:` 或 `env:` 前缀强制指定。DeepSeek 地址默认建议 `DEEPSEEK_API_KEY`，OpenCode 地址默认建议 `OPENCODE_API_KEY`，直接回车即可采用 |
| Model IDs | 先列出接口返回的模型，按编号选择；可以输入多个编号（如 `1,3`）、`all`，也可以直接输入模型 ID。第一个是默认模型 |

- **选择模型**：填好地址和凭据后，dcl 会先向该接口查询可用模型，按 `1`、`2`、`3` 编号列出，输入编号即可，例如 `1,3` 保存第 1 和第 3 个，输入 `all` 保存全部，直接回车保存第 1 个。编号顺序就是列表顺序，排在前面的编号是默认模型。
- **查询不到模型时**：地址不通、凭据还只是未设置的环境变量、或接口不提供模型列表时，dcl 会说明原因，并改为手动输入逗号分隔的模型 ID。手动输入同样有效，不会因此中断保存。
- **答错时**：会说明原因并重新询问，最多 3 次；3 次都不合格时放弃，不保存任何内容。
- **直接填 Key**：Key 写入数据目录 `config.json` 的 `api_key` 字段，只有当前用户可读，Desktop 也直接使用，不需要再设置环境变量。换 Key 时重新运行 `/provider edit <ID>`。
- **填环境变量名**：配置里只保存名字，Key 留在环境变量中。变量尚未设置时会提示，选择该提供商前先设置：
  - bash / zsh：`export DEEPSEEK_API_KEY=sk-...`
  - Windows：`setx DEEPSEEK_API_KEY sk-...`，设置后需要打开新的终端。
- **保存后切换**：可以直接把当前会话切换到新的提供商，对话历史保留；再用 `/test` 验证连通性。
- **保存后立即检查**：向导保存后会用第一个模型发一个很小的请求，成功显示 `Connected with <模型>.`；失败时显示原因，但提供商仍然保留，可用 `/provider edit <ID>` 修正。Key 来自环境变量且当前终端没有设置时跳过检查。

OpenCode Go 的模型分属四种协议，一个提供商就能覆盖全部模型，建议直接使用预设：

```text
❯ /provider add opencode-go
```

它不经过通用向导，先读取 `OPENCODE_API_KEY`，再列出全部模型供选择，只用所选模型做连接测试。手填 `https://opencode.ai/v1` 时 dcl 会提示并自动纠正地址，详见[接入 OpenCode Go](./opencode-go.md)。

## 凭据从哪里读取

dcl 不把 API Key 写进会话记录，使用时按下面的顺序确定读哪个环境变量：

1. 启动参数 `--api-key-env <变量名>`；
2. 提供商自己记录的环境变量名，即 `/provider add` 时填写的值，保存在 `settings.apiKeyEnv`；
3. 内置提供商目录为它约定的变量，例如 OpenRouter 用 `OPENROUTER_API_KEY`；
4. 模型来源的默认变量，例如 `deepseek` 开头的模型用 `DEEPSEEK_API_KEY`。

前两项属于显式指定：变量不存在或为空时，dcl 直接报错 `API key environment variable ... is empty or unset`，不会用空 Key 发请求。

如果提供商在 `config.json` 里直接保存了 `api_key`（即在 `/provider add` 中直接填 Key，或由 Desktop 添加），且没有设置对应的环境变量时，dcl 会直接使用它，不需要再配置环境变量。该字段是明文，请确保数据目录只有本人可读，不要在共享机器上保存正式 Key。

## 切换提供商和模型

| 命令 | 作用 |
|---|---|
| `/provider` | 列出已启用的提供商并选择一个 |
| `/provider list` | 只列出已启用的提供商，不切换 |
| `/provider <ID>` | 直接切换到指定提供商 |
| `/provider edit <ID>` | 修改已保存的提供商 |
| `/model` | 列出当前提供商的模型并选择 |
| `/model <ID>` / `/model list` | 直接切换 / 只列出 |
| `/test` | 用当前提供商和模型发一个很小的请求，确认能连通 |

`/provider` 和 `/model` 都接受列表里的编号，输入编号和输入 ID 效果相同，直接回车保持当前选择。在支持方向键的终端里，`/model` 会打开选择列表，`←`、`→` 调整本次会话的思考强度，`Enter` 切换模型，`Esc` 取消。

切换时对话历史保留，并保存所选提供商和模型作为新会话的默认值。恢复已有会话时使用该会话保存的选择；显式启动参数仍优先于默认值。

如果当前会话用的是临时提供商，`/model` 会说明原因，并列出已保存的提供商，告诉你用 `/provider <ID>` 切换过去。

## 启动参数

| 参数 | 作用 |
|---|---|
| `-m, --model <ID>` | 模型 ID，也可以写成 `provider::model` |
| `--provider <ID>` | 使用已保存的提供商 |
| `--api-format anthropic\|openai` | 临时提供商使用的协议 |
| `--base-url <URL>` | 临时覆盖接口地址，不写入配置 |
| `--api-key-env <变量名>` | API Key 所在的环境变量；不要把 Key 写在参数里 |
| `--max-tokens <n>` | 每次回复的输出上限，见[输出上限与自动续写](./output-limit.md) |
| `--effort off\|low\|medium\|high\|xhigh\|max` | 思考强度 |

## 非交互地修改 CLI 提供商：`dcl config`

```bash
dcl config show                      # 查看生效的配置，凭据会被隐藏
dcl config set model deepseek-flash  # 可设置 model、base_url、api_format、api_key、max_tokens
dcl config reset                     # 只删除 CLI 管理的提供商和偏好
```

## 手工编辑 `config.json`

需要批量调整，或者想把配置复制到另一台机器时，可以直接编辑数据目录下的 `config.json`。保存后执行 `/provider` 就能看到新的提供商，不需要重启。

```json
{
  "providers": [
    {
      "id": "deepseek",
      "name": "DeepSeek",
      "provider_type": "openai",
      "api_key": null,
      "base_url": "https://api.deepseek.com",
      "models": [
        {
          "id": "deepseek-flash",
          "name": "DeepSeek Flash",
          "enabled": true,
          "max_tokens": 8192,
          "supports_vision": false,
          "supports_text": true,
          "supports_tools": true,
          "supports_streaming": true,
          "context_window": 128000,
          "api": null
        }
      ],
      "enabled": true,
      "is_default": false,
      "settings": { "apiKeyEnv": "DEEPSEEK_API_KEY" }
    },
    {
      "id": "local",
      "name": "本地推理服务",
      "provider_type": "openai",
      "api_key": null,
      "base_url": "http://127.0.0.1:8000/v1",
      "models": [
        {
          "id": "qwen3-32b",
          "name": "Qwen3 32B",
          "enabled": true,
          "max_tokens": 8192,
          "supports_vision": false,
          "supports_text": true,
          "supports_tools": true,
          "supports_streaming": true,
          "context_window": 131072,
          "api": null
        }
      ],
      "enabled": true,
      "is_default": false,
      "settings": { "apiKeyEnv": "LOCAL_API_KEY" }
    }
  ],
  "default_provider_id": "deepseek"
}
```

各字段的作用：

- `id`：唯一标识，只能使用字母、数字、`-`、`_`，切换时用它，例如 `/provider local`。
- `provider_type`：接口协议，`openai` 或 `anthropic`；使用 Gemini 协议时由向导写入 `settings.builtinId`，手写配置一般用不到。
- `base_url`：以 `http://` 或 `https://` 开头，可以带 `/v1` 等路径，不要带账号密码和查询参数。
- `api_key`：直接保存 Key，适合个人机器；写成 `null` 表示从环境变量读取。
- `settings.apiKeyEnv`：环境变量名，和 `api_key` 二选一。两者都写时命令行优先用环境变量，变量没设置会直接报错。
- `models[].id`：发给接口的真实模型 ID；`name` 只用于显示。
- `models[].enabled`：设为 `false` 后不出现在 `/model` 列表里。
- `models[].context_window`：上下文窗口，用来判断什么时候压缩历史；`max_tokens` 是单次输出上限，不填时按 8192 处理。
- `gpt-6-astra` 未填写 `context_window` 时默认使用 256000 tokens（256K），已保存但未设置窗口的模型也会在运行时使用该默认值；显式设置的窗口保持优先。上下文窗口与单次输出上限分别配置。
- `enabled`：整个提供商设为 `false` 后，`/provider` 不再列出。
- `default_provider_id`：新会话默认使用的提供商，也可以给某个提供商写 `is_default: true`。

JSON 写错时，启动会报 `Invalid config` 并指出文件位置；dcl 不会用默认配置覆盖损坏的文件，改回来即可。

## 相关文档

- [接入 DeepSeek](./deepseek.md)
- [接入 OpenCode Go](./opencode-go.md)
- [数据目录](./data-directory.md)：`config.json` 和会话数据的位置
- [状态查看](./status.md)：查看当前使用的提供商、模型和接口地址

## 使用 Responses 接口

在 `/provider add` 或 `/provider edit <ID>` 中选择 `4`（`responses`，也接受 `openai-responses`）。填写服务商提供的 API 根地址，例如 `https://api.openai.com/v1`，再选择模型。请求发送至该根地址下的 `/responses`；模型列表仍通过 `/models` 查询，不提供列表的服务可以手动输入模型 ID。

`openai` 使用 Chat Completions 协议。第三方声明兼容 OpenAI 时，请按其文档选择实际支持的接口。Responses 支持工具调用及流式输出，切换协议后保留会话历史。发送历史时会把过长的工具调用标识映射为稳定的短标识，保持调用与结果配对。

## 请求追踪与思考强度

模型请求会携带真实客户端信息和追踪 ID，便于在代理日志中按会话定位请求：

- `user-agent`、`x-app`、`originator` 标识 dcl 或 Desktop；`x-dcl-runtime`、`x-dcl-os`、`x-dcl-arch` 描述运行环境。
- `x-dcl-session-id` 对应当前会话 ID，恢复会话后保持不变。OpenCode 的接口额外要求 `x-opencode-session`，其余供应商不会收到会话 ID。子代理使用自己的会话 ID；可取得父会话关系时，附带 `x-parent-session-id`。
- `x-dcl-turn-id` 标识一次引擎执行。同一轮工具循环中的多个模型请求共享它；新一轮或恢复执行会生成新值。
- `x-request-id` 与 `x-client-request-id` 标识一次模型请求，主循环中的值与请求详情中的 ID 一致。同一请求的网络重试保留此 ID；`x-dcl-retry-count` 从 `0` 开始递增。

工具调用 ID、消息 ID、供应商响应 ID 各自用于工具配对、消息存储和响应定位，不能代替会话 ID。一个模型请求可能包含多条历史消息和多个工具结果，因此不使用单一消息 ID 作为请求头。

使用 `/effort xhigh` 可以将强度保存到当前会话；`--effort xhigh` 用于启动时指定。走 Anthropic Messages 兼容接口的非 Claude 模型或别名会发送：

```json
{
  "thinking": { "type": "adaptive" },
  "output_config": { "effort": "xhigh" }
}
```

支持自适应思考的 Claude 型号使用相同的 effort 字段；旧式 Claude 型号继续使用其支持的 `thinking.budget_tokens`。结构化输出的 `output_config.format` 与 effort 可同时保留。OpenAI Chat Completions 使用 `reasoning_effort`，Responses 使用 `reasoning.effort`。最终可用级别由所选模型和服务端决定。

排查代理链路时，用会话 ID 找到请求，再分别查看入口请求体与上游请求体；协议转换后字段名称可能不同。

## Responses 请求档案与客户端身份

有些 Responses 兼容接口按 Codex 客户端发出的请求形状做兼容，要求补齐标准的 Responses 字段，甚至按客户端标识分流。`/switch` 为当前会话选择请求档案，只作用于声明了 Responses 协议的模型，即模型配置里的 `api` 为 `openai-responses` 或 `openai-codex-responses`；其他协议的请求保持原样。

- `/switch` 显示当前档案，不改变设置。
- `/switch compat` 补齐标准的 Responses 字段，客户端身份仍标识为 dcl。
- `/switch codex` 在 `compat` 的基础上，把请求写成 Codex 客户端的样子。
- `/switch default`（也接受 `off`）恢复默认，请求与升级前完全一致。

两个档案分别增加的内容：

- `compat` 补齐标准的 Responses 字段：请求带工具时加入 `tool_choice` 和 `parallel_tool_calls`，没有工具时不发这两个字段；同时加入 `prompt_cache_key` 和 `text.verbosity`。`prompt_cache_key` 使用会话 ID，便于服务端做缓存亲和；`reasoning.context` 只在请求已带推理配置时加入，需要完整的推理字段时配合 `/effort` 使用。
- `codex` 在 `compat` 的基础上替换客户端身份：`user-agent`、`originator`、`session-id`、`thread-id`、`x-codex-window-id`、`x-codex-turn-metadata`，请求体附带 `client_metadata`，其中的 `turn_id` 与请求头一致。此时不再发送 `x-app` 和 `x-dcl-*` 这些 dcl 自有标识，避免一个请求里同时出现两种身份。

档案按会话保存，`/clear` 时沿用，`--resume` 恢复会话时按该会话保存的值生效。它存放在会话设置中，不写进 `config.json`，也不改变 `providers.json`。

使用前请确认这几点：

- 该功能面向自己持有 Key、按量计费的 Responses 兼容接口。它改变的是请求形状，不改变凭据归属。
- 服务端下发的 `x-codex-turn-state` 不会被保存或回放，`x-openai-internal-*`、`x-codex-beta-features` 等私有标记也不会发送。
- 请求只包含标识符，不上报本地路径、git 远程地址或沙箱设置。
- 网关原生压缩（`/responses/compact`）由单独的请求发出，不携带该档案；对话本身和工具循环使用所选档案。
