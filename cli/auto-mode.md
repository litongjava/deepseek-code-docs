# 自动权限模式

`auto` 模式用一次独立的模型调用，判断每个工具调用是否在你授权的范围内：普通任务操作直接放行；不能自动批准、具有危险副作用或授权不明确的操作交给你确认。它适合希望减少确认、但又不想完全放开的场景。

## 配置分类器

auto 模式需要先**显式**配置用哪个模型做判断，否则启动时报 `Auto permissions are disabled`。在交互模式里：

```text
/permissions auto-config set {"enabled":true,"classifier":{"kind":"current"}}
/permissions auto-config show
```

- `classifier.kind`：`current` 使用当前会话的模型；`named` 配合 `provider_id`、`model_id` 指定另一个模型。
- `timeout_ms`：单次判断的超时，100 到 60000，默认 15000。
- `max_input_tokens`：发给分类器的上下文上限，默认 8192。
- `failure_policy`：默认 `manual`；兼容读取旧的 `deny` 配置，有交互审批宿主时分类器异常统一转人工确认。

`/permissions auto-config off` 关闭。

## 使用

```bash
dcl -m deepseek-flash --api-format anthropic --permission-mode auto -p "创建 hello.txt，内容为 hi"
```

交互模式里用 `/permissions auto` 切换。也可以在工具审批菜单选择启用并切换到 Auto；首次配置会选择当前模型及 `manual` 失败策略，已有分类器、超时和预算配置保持不变。成功提交后，状态栏即时显示 Auto 模式。

分类器超时、传输失败、无效返回、输入超限或分类器配置不可用时，前台终端、连接前台的 worker 及 SDK 审批宿主都会收到人工审批请求，旧配置中的 `deny` 也不会跳过这一步。没有审批宿主时保持不执行，并说明原因。分类器返回 `deny` 表示不能自动批准，同样转人工确认；明确的 deny 规则、工具禁用和 Plan 模式边界仍然直接生效，不会被人工回退绕过。缺少可验证的用户授权记录时也请求人工确认，而不是中止整轮。

## 项目外路径与危险操作

项目外路径本身不代表危险。Auto 可以读取、搜索和列出任务相关的外部目录，普通跨目录开发、文档维护和可逆编辑可以由分类器批准。

通过分类器或人工批准的 `Write`、`Edit`、`MultiEdit`、`NotebookEdit` 只获得本次调用目标文件的临时访问权限，不会把父目录加入永久允许列表，也不会放开其他会话。切换离开 Auto 后，该临时权限不再生效。

命中 Bash 危险命令关键字过滤的调用先请求人工确认；批准后仅这条命令可通过关键字过滤。操作系统权限和配置的沙箱限制仍然有效，批准不等同于开启 full-access。没有审批宿主时，需要确认的操作不执行。

## 限制

- 分类器异常不计入拒绝次数；拒绝次数仅用于统计，不设置连续或累计次数上限。每次调用独立审批，被拒绝的调用会把原因返回给模型，后续调用仍可继续审批。
- 分类器只看到你明确表达过的授权和当前的调用，不会看到工具返回的内容。
- DeepSeek 在 Anthropic 协议下会先返回思考内容再给出判断，dcl 会跳过思考，只解析唯一的文本答案。

## 相关文档

- [权限模式与工具审批](./permissions.md)
