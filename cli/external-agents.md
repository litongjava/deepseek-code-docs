# 调用 Claude Code、Codex 与另一个 dcl

如果本机装有 Claude Code（`claude`）、OpenAI Codex（`codex`），或者安装了 dcl 本身（`dcl` 在 `PATH` 上），dcl 的模型可以把一个独立的子任务交给它们去做，再把结果带回当前对话。典型用法：

- 请另一个代理**复核**刚写好的代码，获得第二意见；
- 把一个边界清楚的子任务交给它完成；
- 你明确要求"让 Codex 来做"。

## 什么时候可用

- `ClaudeCode`：`PATH` 上能找到 `claude`。
- `Codex`：`PATH` 上能找到 `codex`。
- `DeepSeekCode`：`PATH` 上能找到 `dcl`；由这个工具启动的 dcl 不再提供它，避免无限嵌套。

没有安装时，模型看不到这个工具。**登录和账号由你自己处理**，dcl 不保存、也不传递它们的凭据。

## 参数

- `prompt`：必填，完整、独立的任务说明。对方看不到当前对话，要写清目标、相关文件和要求。
- `mode`：`read-only`（默认）只读和分析；`edit` 允许修改项目里的文件。
- `model`：可选，对方使用的模型；不填时用它自己的默认值。
- `timeout_secs`：可选，默认 600 秒，最多 3600 秒，超时后结束对方的进程树。
- `session_id`：可选，填上次结果返回的会话 ID，继续那个会话；不填则开始新会话。三种工具都支持。

会话 ID 必须是 UUID。大写、无连字符、花括号和 `urn:uuid:` 写法会统一成小写带连字符形式。Claude Code 和 dcl 用 `--resume`，Codex 用 `codex exec resume <id>`。恢复 Codex 时，会核对它报告的线程 ID；与请求的会话不一致就报错。

你也可以直接对模型说："用 Codex 以只读方式检查一下 calc.py 有没有 bug"。

## 两种模式实际做什么

- **Claude Code / dcl**：以 `-p --output-format json` 非交互运行。`read-only` 使用 `--permission-mode default`，需要审批的操作会被拒绝；`edit` 使用 `--permission-mode acceptEdits`，可以改文件，仍不能运行需要审批的命令。
- **Codex**：以 `codex exec --json` 运行。`read-only` 使用 `--sandbox read-only`；`edit` 使用 `--sandbox workspace-write`，允许在项目目录内修改文件。

Codex 新建和恢复会话时都会传入当前项目目录、该次调用的沙箱和可选模型，以及输出参数。`exec` 的选项放在 `resume <id>` 前，新提示词放在 `--` 后，以 `-` 开头也不会被当作选项。

三种工具都在当前项目目录中运行，没有标准输入，不能向你提问。

## 返回结果

```text
● ClaudeCode(Is there a bug in calc.py? Answer in one sentence.) · 4.1s
  ⎿  {
       "agent": "Claude Code",
       "answer": "Yes — `add` on `calc.py:2` returns `a - b` instead of `a + b`.",
     … +5 lines (Ctrl+O to expand)
```

返回给模型的内容包括最终回答（超过 60000 字节会截断）、耗时和会话 ID；Claude Code 和 dcl 还会返回费用。模型可以把会话 ID 作为下一次调用的 `session_id`，继续之前的工作。

Codex 的会话 ID 来自 `thread.started` 事件，Claude Code 和 dcl 则使用返回的 `session_id`。Codex 缺少有效线程 ID、报告了不同的线程 ID、出现 `turn.failed`、缺少 `turn.completed` 或以非零状态退出时，调用都会失败。

Codex 成功完成但事件流没有最终消息或消息为空时，会尝试读取 `--output-last-message` 文件。文件缺失或为空时，返回空 `answer` 和说明原因的 `note`，仍算成功；文件存在但无法读取或不是有效 UTF-8 时会报错。

调用失败时会返回原因；登录提示如下：

- Claude Code：在终端运行一次 `claude` 并登录，或设置 `ANTHROPIC_API_KEY`；
- Codex：运行 `codex login`，或在 `~/.codex/config.toml` 中配置模型提供商；
- dcl：在终端运行一次 `dcl` 并配置模型提供商，见[首次启动](./first-run.md)。

## 权限

调用会启动另一个编码代理，所以和 Bash 一样：ask 模式下每次调用都需要你确认，计划模式下不可用。审批提示会显示交给对方的任务内容。取消当前这一轮或调用超时时，对方的进程及其派生的子进程会一起结束。CLI 收到 `Ctrl+C`（SIGINT）时取消当前轮；在 Unix 上收到 SIGTERM 或 SIGHUP 时，先取消当前轮、清理进程树，再退出。

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
