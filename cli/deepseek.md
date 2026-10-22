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

## 结构化输出：`--json-schema`

DeepSeek 两种协议都不强制结构化输出：Anthropic 兼容接口静默忽略 `output_config.format`，OpenAI 兼容接口拒绝 `json_schema` 类型的 `response_format`。

因此对 `deepseek.com` 地址，dcl 不发送这两个字段，而是把 schema 写进系统提示词，要求模型只输出 JSON；收到回复后仍在本地按 schema 校验。模型偶尔包上的一层 Markdown 代码块会被去掉，`structured_output` 字段里是解析后的对象。

```bash
dcl -m deepseek-flash --api-format anthropic --output-format json \
  --json-schema '{"type":"object","properties":{"capital":{"type":"string"}},"required":["capital"]}' \
  -p "法国的首都是哪里？"
```

模型输出不符合 schema 时，本次运行失败并报 `Structured output does not match JSON schema` 或 `Structured output is not valid JSON`。

## 自动权限模式（`--permission-mode auto`）

auto 模式用一次独立的模型调用判断每个工具调用是否在授权范围内，需要先在交互模式里显式配置分类器，例如使用当前模型：

```text
/permissions auto-config set {"enabled":true,"classifier":{"kind":"current"}}
```

之后即可在非交互模式使用：

```bash
dcl -m deepseek-flash --api-format anthropic --permission-mode auto -p "创建 hello.txt，内容为 hi"
```

DeepSeek 在 Anthropic 协议下会先返回思考块再给出判断，dcl 会忽略思考块，只解析唯一的文本答案。
