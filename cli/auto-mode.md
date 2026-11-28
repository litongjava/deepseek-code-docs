# 自动权限模式

`auto` 是“确定性规则 + 可选分类器”的模式，不是每个工具都问模型。

## 规则

- **直接放行**：只读工具；普通 `Write`、`Edit`、`MultiEdit`、`NotebookEdit`、`ApplyPatch`；未命中危险规则的 `Bash` / `PowerShell`；`TodoWrite`、`TaskCreate`、`TaskUpdate`；MCP 只读；`GitHub` 读；`Config` 读；`Agent` / `Task` / `team`；`SendMessage`；`TaskStop`；`SearchReplace` / `GlobReplace`。
- **人工确认**：危险 `Bash` / `PowerShell`；受保护路径编辑（`.git`、`.vscode`、`.idea`、`.claude`、`.deepseek-code`、`.gitconfig`、`.bashrc`、`.zshrc`、`.mcp.json` 等）；本地/内网 `WebFetch`；MCP 写；`GitHub` 写；`Config` 写；`Delete`；`cron` / `CronCreate` / `CronDelete` / `ScheduleWakeup`；显式 `Confirm` 和 `requires_confirmation`。
- **分类器**：未归类的未知工具；未预批准的公网 `WebFetch`；`SkillCreate` / `SkillUpdate`。分类器拒绝、超时、传输失败、无效返回、输入超限或未配置时，转人工确认。
- **直接拒绝**：显式 `Deny`、工具禁用。

未命中危险规则不代表脚本已经审计。`python`、`awk`、未知脚本仍属于普通 Shell，直接放行。

## 配置分类器（可选）

`auto` 不要求先配置分类器。没有配置时，未知工具直接转人工，不会回退到 `ask`，也不会让启动失败；配置后，未知工具才发分类请求。

在交互模式里：

```text
/permissions auto-config set {"enabled":true,"classifier":{"kind":"current"}}
/permissions auto-config show
```

- `classifier.kind`：`current` 使用当前会话的模型；`named` 配合 `provider_id`、`model_id` 指定另一个模型。
- `timeout_ms`：单次判断的超时，100 到 60000，默认 15000。
- `max_input_tokens`：发给分类器的上下文上限，默认 8192；实现按 UTF-8 字节估算，不是精确 token。
- `failure_policy`：默认 `manual`；兼容读取旧的 `deny` 配置，有交互审批宿主时分类器异常统一转人工确认。

`/permissions auto-config off` 关闭分类器；`auto` 仍会按上面的本地规则运行，未知工具转人工。

### 支持的分类器传输

分类器支持：

- 直连 OpenAI Chat Completions；
- 直连 Anthropic Messages；
- `openai-responses`：
  - `builtinId=openai` + `model.api=openai-responses`；
  - 普通 provider（没有 `builtinId`）+ `model.api=openai-responses`。

其他内置 provider 传输（Azure、Codex、Bedrock、Google 等）仍然不支持作为分类器。`classifier.kind=current` 只有在当前主模型属于上述组合时才可用；否则会提示分类器不可用，未知工具转人工。

## 使用

```bash
dcl -m deepseek-flash --api-format anthropic --permission-mode auto -p "创建 hello.txt，内容为 hi"
```

交互模式里用 `/permissions auto` 切换。也可以在工具审批菜单选择启用并切换到 Auto；首次配置会选择当前模型及 `manual` 失败策略，已有分类器、超时和预算配置保持不变。成功提交后，状态栏即时显示 Auto 模式。

分类器超时、传输失败、无效返回、输入超限或分类器配置不可用时，前台终端、连接前台的 worker 及 SDK 审批宿主都会收到人工审批请求，旧配置中的 `deny` 也不会跳过这一步。没有审批宿主时保持不执行，并说明原因。分类器返回 `deny` 表示不能自动批准，同样转人工确认；明确的 deny 规则、工具禁用和 Plan 模式边界仍然直接生效，不会被人工回退绕过。缺少可验证的用户授权记录时也请求人工确认，而不是中止整轮。

## 项目外路径与危险操作

项目外路径本身不代表危险。Auto 可以读取、搜索和列出任务相关的外部目录，普通跨目录开发、文档维护和可逆文件编辑直接放行；受保护路径保留现有审批检查。

获准执行的 `Write`、`Edit`、`MultiEdit`、`NotebookEdit` 只获得本次调用目标文件的临时访问权限，不会把父目录加入永久允许列表，也不会放开其他会话。切换离开 Auto 后，该临时权限不再生效。

命中 Bash 危险规则的调用先请求人工确认；批准后只有本次经过校验的确切命令可执行，后续命令仍重新检查。Ask 和 Accept-edits 下也支持这种单次批准。操作系统权限和配置的沙箱限制仍然有效。没有审批宿主时，需要确认的操作不执行。

## 限制

- 分类器异常不计入拒绝次数；拒绝次数仅用于统计，不设置连续或累计次数上限。每次调用独立审批，被拒绝的调用会把原因返回给模型，后续调用仍可继续审批。
- 分类器只看到你明确表达过的授权和当前的调用，不会看到工具返回的内容。
- 分类器只处理未归类的未知工具、未预批准的公网 `WebFetch` 和 `SkillCreate` / `SkillUpdate`；普通 Shell、普通文件编辑和只读工具不会产生分类请求。
- DeepSeek 在 Anthropic 协议下会先返回思考内容再给出判断，dcl 会跳过思考，只解析唯一的文本答案。

## 相关文档

- [权限模式与工具审批](./permissions.md)
