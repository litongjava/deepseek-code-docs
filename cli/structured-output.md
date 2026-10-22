# 结构化输出

`--json-schema` 要求最终回复是符合给定 JSON Schema 的 JSON，适合把 dcl 的结果交给脚本处理。

## 用法

```bash
dcl -m deepseek-flash --api-format anthropic --output-format json \
  --json-schema '{"type":"object","properties":{"capital":{"type":"string"},"population_millions":{"type":"number"}},"required":["capital","population_millions"],"additionalProperties":false}' \
  -p "法国的首都是哪里？" < /dev/null
```

输出的 `result` 事件中，`structured_output` 是解析后的对象：

```json
{"type":"result","is_error":false,"structured_output":{"capital":"Paris","population_millions":68.3}, ...}
```

## 校验规则

- **Schema 本身**：必须是 JSON 对象，大小不超过 1 MiB；`$ref` 只能引用文档内部（以 `#` 开头）。
- **回复内容**：必须能解析为 JSON 并通过 Schema 校验，否则这次运行失败，报错为下面两种之一：
  - `Structured output is not valid JSON`；
  - `Structured output does not match JSON schema: ...`。
- **代码块包裹**：回复外面包了一层 Markdown 代码块（```` ```json ````）时会自动去掉，`structured_output` 里是干净的对象。

## 不同接口的实现方式

| 接口 | 方式 |
|---|---|
| Anthropic 官方、OpenAI 等 | 通过接口强制约束输出：`output_config.format` 或 `response_format` |
| DeepSeek（`deepseek.com`） | 两种协议都不支持强制约束：Anthropic 兼容接口会忽略该字段，OpenAI 兼容接口会直接拒绝。所以 dcl 把 Schema 写进系统提示词，要求只输出 JSON，再在本地校验 |

两种方式最终都经过同样的本地校验，脚本拿到的结果格式一致。

## 相关文档

- [非交互模式](./non-interactive.md)
