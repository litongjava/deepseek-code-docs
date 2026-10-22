# 模型与提供商

**提供商**（provider）是一组连接信息：协议、接口地址、API Key 所在的环境变量，以及可用的模型列表。dcl 有两种使用方式：

| 方式 | 特点 |
|---|---|
| **临时提供商** | 用命令行参数或环境变量启动，例如 `-m deepseek-flash` 配合 `DEEPSEEK_API_KEY`。不写入配置，`/model` 列不出模型 |
| **保存的提供商** | 用 `/provider add` 保存到数据目录，之后可以用 `/provider`、`/model` 随时切换，Desktop 也能看到 |

## 保存一个提供商：`/provider add`

在交互模式里运行 `/provider add`，按提示逐项填写：

```text
> /provider add
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

## 切换提供商和模型

| 命令 | 作用 |
|---|---|
| `/provider` | 列出保存的提供商并选择一个 |
| `/provider <ID>` | 直接切换到指定提供商 |
| `/provider edit <ID>` | 修改已保存的提供商 |
| `/model` | 列出当前提供商的模型并选择 |
| `/model <ID>` / `/model list` | 直接切换 / 只列出 |
| `/test` | 用当前提供商和模型发一个很小的请求，确认能连通 |

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

## 相关文档

- [接入 DeepSeek](./deepseek.md)
- [状态查看](./status.md)：查看当前使用的提供商、模型和接口地址
