# 设置项参考

本页汇总可以调整 dcl 行为的设置项和环境变量。每一项的详细说明见对应的功能文档。

## settings.json

位于[数据目录](./data-directory.md)下，JSON 格式。文件不存在时，所有项使用默认值。

```json
{
  "spinnerTipsEnabled": false,
  "promptSuggestionEnabled": false
}
```

| 键 | 默认 | 作用 |
|---|---|---|
| `spinnerTipsEnabled` | `true` | 运行中是否在状态行下显示提示，见[运行提示](./tips.md) |
| `promptSuggestionEnabled` | `true` | 一轮结束后是否生成下一句建议，见[建议补全](./suggestions.md) |
| `editorMode` | `normal` | 设为 `vim` 时使用 vim 风格编辑，见[vim 模式](./vim-mode.md) |
| `hooks` | 无 | 工具调用前后执行的 hooks |
| `sandbox` | 无 | 在沙箱中运行 Bash 命令，见[沙箱](./sandbox.md) |
| `shell` | 工具使用 Bash，手动终端保留原默认值 | 共用 Shell 配置，见下文 |
| `permissions` | 无 | `allow`、`ask`、`deny` 规则列表，见[权限](./permissions.md#规则) |
| `remoteControlAtStartup` | `false` | 交互会话启动时自动连接远程控制，见[远程控制](./remote-control.md#启动时自动连接) |

这两个开关和 Claude Code 的同名设置含义一致。

## 请求记录

在数据目录的 `settings.json` 中设置 `"requestRecording": { "enabled": true }` 可开启原始模型请求与响应记录，设为 `false` 可显式关闭。默认关闭；`--full-access`（`--yolo`）在未显式配置时自动开启。

优先级是 `--record-requests` 强制开启 → `DEEPSEEK_CODE_RECORD_REQUESTS` 的有效值 → `requestRecording.enabled` → 完全访问模式自动开启。环境变量支持 `1`、`true`、`0`、`false`。请求体不脱敏，完整示例、保存位置与隐私说明见[请求记录](./request-recording.md)。Desktop 使用同一份数据目录配置。

## Shell 配置

`shell` 与其他设置共用数据目录的 `settings.json`。模型工具读取 `toolDefault`，dcl 的 `!` 命令读取 `terminalDefault`；工具参数显式指定 `shell` 时优先。

```json
{
  "shell": {
    "toolDefault": "bash",
    "terminalDefault": "auto",
    "bashPath": "D:\\Program Files\\Git\\bin\\bash.exe"
  }
}
```

```powershell
dcl config set shell.bashPath 'D:\Program Files\Git\bin\bash.exe'
dcl config set shell.toolDefault bash
dcl config set shell.terminalDefault bash
dcl config show
```

Shell 名称支持 `bash`、`sh`、`zsh`、`fish`、`cmd`、`powershell`、`pwsh`，所选程序需要已安装。`terminalDefault: "auto"` 保留入口原有默认行为；dcl 在 Windows 优先使用 PowerShell 7，找不到时使用 Windows PowerShell。

Bash 路径优先级：`DEEPSEEK_CODE_BASH_PATH` 环境变量 → `shell.bashPath` → 自动发现。显式路径必须是存在的绝对文件路径；不能填 System32 或 WindowsApps 中的 WSL Bash 别名。路径失效时直接报错。将 `bashPath` 设为 `null` 或删除该字段可恢复自动发现。

`dcl config show` 的 `shell` 项显示保存值、实际程序路径和来源（`environment`、`settings`、`detected`），解析失败时显示原因。文件配置对下一条命令生效；环境变量变更需要重启应用和 Worker。

### WSL

WSL 是独立的 Shell 选项 `wsl`，由 `wsl.exe` 启动所选 Linux 发行版中的 Bash；它不是 Git Bash 的另一个路径。

```powershell
dcl config set shell.wsl.distribution dcl-linux-test
dcl config set shell.wsl.bashPath /bin/bash
dcl config set shell.toolDefault wsl
dcl config set shell.terminalDefault wsl
```

必须明确指定已经安装的发行版，不会使用系统默认发行版。发行版内需要 Bash、`wslpath` 和 `setsid`；`wsl.bashPath` 是 Linux 绝对路径。Windows 项目路径通过所选发行版的 `wslpath` 转换，包含空格和中文的路径按独立参数传递。工作目录按会话和发行版分别保存。

前台超时、取消、后台任务停止会结束本次调用拥有的 Linux 进程组，不会终止整个发行版。主动脱离进程组的守护进程不在这一保证内。启用的沙箱目前不能隔离 WSL 时会明确拒绝执行，不能通过指定 WSL 绕过沙箱。

## 环境变量

| 变量 | 作用 | 文档 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_BASE_URL` | 覆盖 DeepSeek 接口地址 | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_CODE_DATA_DIR` | 数据目录 | [数据目录](./data-directory.md) |
| `DEEPSEEK_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | 启用代理团队工具 | [代理团队](./agent-teams.md) |
| `CLAUDE_BRIDGE_OAUTH_TOKEN` | 远程控制服务的 token | [远程控制](./remote-control.md) |
| `TEAM_SYNC_TOKEN` | 团队同步客户端 token | [团队同步](./team-sync.md) |
| `TEAM_SERVER_TOKENS` | 团队同步服务端的 token 与团队映射 | [团队同步](./team-sync.md) |
| `NO_COLOR` | 设为任意值时不输出颜色 | |

## 常用启动参数

| 参数 | 作用 | 文档 |
|---|---|---|
| `-m, --model` | 模型 | [模型与提供商](./providers.md) |
| `--api-format` | 协议 | [模型与提供商](./providers.md) |
| `--max-tokens` | 输出上限 | [输出上限与自动续写](./output-limit.md) |
| `--permission-mode` | 权限模式 | [权限模式与工具审批](./permissions.md) |
| `--allowed-tools` | 本次免确认的工具 | [权限模式与工具审批](./permissions.md) |
| `--allow-dangerously-skip-permissions` | 兼容参数；普通启动已允许切换 bypass | [权限模式与工具审批](./permissions.md#权限模式) |
| `--yolo` / `--full-access` | 完全访问：bypass 并忽略命令黑名单、deny 规则和沙箱 | [权限模式与工具审批](./permissions.md#完全访问) |
| `--data-dir` | 数据目录 | [数据目录](./data-directory.md) |
| `-p, --print` | 非交互执行一次 | [非交互模式](./non-interactive.md) |
| `--json-schema` | 结构化输出 | [结构化输出](./structured-output.md) |

完整列表用 `dcl --help` 查看。

## 环境变量名称迁移

运行控制变量统一使用 `DEEPSEEK_CODE_` 前缀，旧的 `CLAUDE_CODE_` 名称不再生效。

- `DEEPSEEK_CODE_MAX_TOOL_USE_CONCURRENCY`：工具并发上限，默认 10，必须为正整数。
- `DEEPSEEK_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`：退出 Hook 总等待预算，默认 1500 毫秒，必须为正整数。
- `DEEPSEEK_CODE_STOP_HOOK_BLOCK_CAP`：Stop Hook 阻止次数上限，默认 8；0 表示不设上限。
- `DEEPSEEK_CODE_EXPERIMENTAL_AGENT_TEAMS`：启用团队功能，支持 1、true、yes、on。

修改进程环境变量后，重新启动应用及对应 Worker。外部引擎协议变量和敏感信息脱敏中的旧名称不属于旧配置兼容。
