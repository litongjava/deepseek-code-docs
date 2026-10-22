# 接入 DeepSeek 模型

DeepSeek 官方 API 同时提供 OpenAI 兼容接口和 **Anthropic 兼容接口**（`https://api.deepseek.com/anthropic`）。`dcl` 通过 Anthropic 协议使用 DeepSeek 时，工具调用、思考块和流式输出都走 Messages API 语义。

## 可用模型

可以用接口查询当前账号可用的模型：

```bash
curl -s https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

截至 2026-10 返回 `deepseek-flash`（DeepSeek-V4.1-Flash，1M 上下文）和 `deepseek-v4-pro`，二者都声明支持 `anthropic_messages`。

## 配置

`dcl` 对 `deepseek` 前缀的模型默认读取以下环境变量：

| 变量 | 作用 |
|---|---|
| `DEEPSEEK_API_KEY` | API Key |
| `DEEPSEEK_BASE_URL` | 覆盖接口地址；使用 Anthropic 协议时设为 `https://api.deepseek.com/anthropic` |

```bash
export DEEPSEEK_API_KEY=<你的 API Key>
export DEEPSEEK_BASE_URL=https://api.deepseek.com/anthropic

dcl -m deepseek-flash --api-format anthropic -p "Reply with exactly: pong" < /dev/null
```

- `--api-format anthropic` 指定使用 Messages 协议；不指定时 `deepseek` 模型默认走 OpenAI 协议。
- 也可以用 `--base-url` 临时覆盖地址；它只对本次启动生效，不会写入配置。
- 不要把 API Key 写在命令行参数里；如需使用其他变量名，用 `--api-key-env <变量名>`。

## 与官方 Anthropic 接口的差异

DeepSeek 的兼容实现比 Anthropic 官方更严格：**同一轮的多个 `tool_result` 必须放在紧跟 `tool_use` 的同一条 user 消息里**，连续多条 user 消息不会被合并。`dcl` 已在发送前合并相邻同角色消息，因此模型一次并行调用多个工具（例如同时 Read 和 Bash）可以正常继续。旧版本会报 400，见[故障排查](./troubleshooting.md#tool-use-ids-were-found-without-tool-result)。

## DeepSeek 相关的行为

- **结构化输出**：DeepSeek 两种协议都不强制按 JSON Schema 输出，dcl 改为用提示词约束并在本地校验，见[结构化输出](./structured-output.md)。
- **思考内容计入输出**：DeepSeek 的思考内容占用输出额度，因此 DeepSeek 模型的默认输出上限是 32000 tokens，被截断时会自动续写，见[输出上限与自动续写](./output-limit.md)。
- **自动权限模式**：分类器可以直接使用 DeepSeek 模型，见[自动权限模式](./auto-mode.md)。

## 保存为提供商

上面用环境变量启动的是临时提供商，不会写入配置，所以 `/model` 列不出它的模型。想长期使用、在多个模型之间切换，用 `/provider add` 保存一个提供商，见[模型与提供商](./providers.md)。
