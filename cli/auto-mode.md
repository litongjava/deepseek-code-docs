# 自动权限模式

`auto` 模式用一次独立的模型调用，判断每个工具调用是否在你授权的范围内：在范围内的直接放行，越界、破坏性或会泄露信息的拒绝。它适合希望减少确认、但又不想完全放开的场景。

## 配置分类器

auto 模式需要先**显式**配置用哪个模型做判断，否则启动时报 `Auto permissions are disabled`。在交互模式里：

```text
/permissions auto-config set {"enabled":true,"classifier":{"kind":"current"}}
/permissions auto-config show
```

| 字段 | 说明 |
|---|---|
| `classifier.kind` | `current` 使用当前会话的模型；`named` 配合 `provider_id`、`model_id` 指定另一个模型 |
| `timeout_ms` | 单次判断的超时，100 到 60000，默认 15000 |
| `max_input_tokens` | 发给分类器的上下文上限，默认 8192 |
| `failure_policy` | 分类器失败时的处理：`deny`（默认，拒绝）或 `manual`（改为询问你） |

`/permissions auto-config off` 关闭。

## 使用

```bash
dcl -m deepseek-flash --api-format anthropic --permission-mode auto -p "创建 hello.txt，内容为 hi"
```

交互模式里用 `/permissions auto` 切换。

## 限制

- 连续 3 次拒绝，或一个会话累计拒绝 20 次后，会停止这一轮，避免模型反复尝试。
- 分类器只看到你明确表达过的授权和当前的调用，不会看到工具返回的内容。
- DeepSeek 在 Anthropic 协议下会先返回思考内容再给出判断，dcl 会跳过思考，只解析唯一的文本答案。

## 相关文档

- [权限模式与工具审批](./permissions.md)
