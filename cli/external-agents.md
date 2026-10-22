# 调用 Claude Code 与 Codex

如果本机装有 Claude Code（`claude`）或 OpenAI Codex（`codex`），dcl 的模型可以把一个独立的子任务交给它们去做，再把结果带回当前对话。典型用法：

- 请另一个代理**复核**刚写好的代码，获得第二意见；
- 把一个边界清楚的子任务交给它完成；
- 你明确要求"让 Codex 来做"。

## 什么时候可用

| 工具 | 出现条件 |
|---|---|
| `ClaudeCode` | `PATH` 上能找到 `claude` |
| `Codex` | `PATH` 上能找到 `codex` |

没有安装时，模型看不到这个工具。**登录和账号由你自己处理**，dcl 不保存、也不传递它们的凭据。

## 参数

| 参数 | 说明 |
|---|---|
| `prompt` | 必填。完整、独立的任务说明。对方看不到当前对话，所以要写清目标、相关文件和要求 |
| `mode` | `read-only`（默认）只读和分析；`edit` 允许修改项目里的文件 |
| `model` | 可选，对方使用的模型；不填时用它自己的默认值 |
| `timeout_secs` | 可选，默认 600 秒，最多 3600 秒，超时后结束对方的进程 |

你也可以直接对模型说："用 Codex 以只读方式检查一下 calc.py 有没有 bug"。

## 两种模式实际做什么

| 模式 | Claude Code | Codex |
|---|---|---|
| `read-only` | `claude -p --output-format json --permission-mode default`：非交互运行时，需要审批的操作（改文件、运行命令）都会被拒绝 | `codex exec --sandbox read-only` |
| `edit` | `--permission-mode acceptEdits`：可以改文件，仍然不能运行命令 | `codex exec --sandbox workspace-write`：可以在项目目录内修改文件 |

两者都在当前项目目录中运行，没有标准输入，不能向你提问。

## 返回结果

```text
● ClaudeCode(Is there a bug in calc.py? Answer in one sentence.) · 4.1s
  ⎿  {
       "agent": "Claude Code",
       "answer": "Yes — `add` on `calc.py:2` returns `a - b` instead of `a + b`.",
     … +5 lines (Ctrl+O to expand)
```

返回给模型的内容包括：对方的最终回答（超过 60000 字节会截断）、耗时，以及 Claude Code 的费用和会话 ID。

调用失败时，返回对方自己的错误信息，并附上登录提示：
- Claude Code：在终端运行一次 `claude` 并登录，或设置 `ANTHROPIC_API_KEY`；
- Codex：运行 `codex login`，或在 `~/.codex/config.toml` 中配置模型提供商。

## 权限

调用会启动另一个编码代理，所以和 Bash 一样：ask 模式下每次调用都需要你确认，计划模式下不可用。审批提示会显示交给对方的任务内容。取消当前这一轮时，对方的进程及其派生的子进程会一起结束。

## 限制

- 对方直接修改文件，dcl 拿不到这些修改的明细，所以它们不会出现在本轮结束时的[改动汇总](./tool-calls.md#本轮改动汇总)里，`/rewind` 也无法恢复。需要回退时用 Git。
- 对方运行时，dcl 只显示状态行，看不到它的中间过程；只有最终回答会带回当前对话。

## 让 Codex 和 Claude Code 使用 DeepSeek

没有 OpenAI 或 Anthropic 账号时，也可以让它们使用 DeepSeek 的接口。

**Codex**：新版 Codex 只支持 OpenAI 的 Responses 接口，DeepSeek 已经提供这个接口。在 `~/.codex/config.toml` 中配置：

```toml
model = "deepseek-flash"
model_provider = "deepseek"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/v1"
env_key = "DEEPSEEK_API_KEY"
wire_api = "responses"
```

Codex 会提示 `Model metadata for deepseek-flash not found`，这条警告不影响使用。

**Claude Code**：用环境变量把它指向 DeepSeek 的 Anthropic 兼容接口。在启动 dcl 的终端里设置，子进程会继承：

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=$DEEPSEEK_API_KEY
export ANTHROPIC_MODEL=deepseek-flash
export ANTHROPIC_SMALL_FAST_MODEL=deepseek-flash
```

## 相关文档

- [权限模式与工具审批](./permissions.md)
- [代理团队](./agent-teams.md)：在 dcl 内部并发运行多个子代理
