# 模型与提供商

**提供商**（provider）是一组连接信息：协议、接口地址、API Key 所在的环境变量，以及可用的模型列表。dcl 有三种使用方式：

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
Provider setup; /cancel cancels. Enter environment variable NAMES, never API keys.
Provider ID: deepseek
Protocol (openai / anthropic / gemini): anthropic
Base URL: https://api.deepseek.com
  DeepSeek serves the Anthropic protocol at https://api.deepseek.com/anthropic; using that URL.
API key environment variable name [DEEPSEEK_API_KEY]:
Model IDs (comma separated; first is default): deepseek-flash,deepseek-v4-pro
Saved deepseek (2 models); the API key is read from DEEPSEEK_API_KEY.
Switch this session to deepseek now? [Y/n]:
```

各项的含义和校验规则：

| 项目 | 说明 |
|---|---|
| Provider ID | 字母、数字、`-`、`_`，例如 `deepseek` |
| Protocol | `openai`、`anthropic` 或 `gemini`，不区分大小写 |
| Base URL | `http://` 或 `https://` 开头，不能包含账号密码、查询参数或片段。DeepSeek 选择 Anthropic 协议时自动补成 `/anthropic` |
| API key 环境变量名 | 填**变量名**，不是 Key 本身。DeepSeek 地址默认建议 `DEEPSEEK_API_KEY`，直接回车即可采用 |
| Model IDs | 逗号分隔，第一个是默认模型 |

- **答错时**：会说明原因并重新询问，最多 3 次；3 次都不合格时放弃，不保存任何内容。
- **误粘贴了 API Key**：向导能识别出来，**不会保存**，并提示先设置环境变量：
  - bash / zsh：`export DEEPSEEK_API_KEY=sk-...`
  - Windows：`setx DEEPSEEK_API_KEY sk-...`，设置后需要打开新的终端。
- **保存后切换**：可以直接把当前会话切换到新的提供商，对话历史保留；再用 `/test` 验证连通性。

## 凭据从哪里读取

dcl 不把 API Key 写进会话记录，使用时按下面的顺序确定读哪个环境变量：

1. 启动参数 `--api-key-env <变量名>`；
2. 提供商自己记录的环境变量名，即 `/provider add` 时填写的值，保存在 `settings.apiKeyEnv`；
3. 内置提供商目录为它约定的变量，例如 OpenRouter 用 `OPENROUTER_API_KEY`；
4. 模型来源的默认变量，例如 `deepseek` 开头的模型用 `DEEPSEEK_API_KEY`。

前两项属于显式指定：变量不存在或为空时，dcl 直接报错 `API key environment variable ... is empty or unset`，不会用空 Key 发请求。Desktop 保存的供应商把 Key 直接写在 `config.json` 的 `api_key` 字段里，命令行会直接使用，不需要设置环境变量。

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

切换时对话历史保留。

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
- `enabled`：整个提供商设为 `false` 后，`/provider` 不再列出。
- `default_provider_id`：新会话默认使用的提供商，也可以给某个提供商写 `is_default: true`。

JSON 写错时，启动会报 `Invalid config` 并指出文件位置；dcl 不会用默认配置覆盖损坏的文件，改回来即可。

## 相关文档

- [接入 DeepSeek](./deepseek.md)
- [数据目录](./data-directory.md)：`config.json` 和会话数据的位置
- [状态查看](./status.md)：查看当前使用的提供商、模型和接口地址
