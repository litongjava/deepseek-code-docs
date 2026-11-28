# 设置项参考

本页汇总可以调整 dcl 行为的设置项和环境变量。每一项的详细说明见对应的功能文档。

## config/settings.json

位于[数据目录](./data-directory.md)的 `config/settings.json`，JSON 格式。文件不存在时，所有项使用默认值。

```json
{
  "spinnerTipsEnabled": false,
  "promptSuggestionEnabled": false
}
```

`spinnerTipsEnabled` 和 `promptSuggestionEnabled` 与 Claude Code 的同名设置含义一致。

| 键 | 默认 | 作用 |
|---|---|---|
| `spinnerTipsEnabled` | `true` | 运行中是否在状态行下显示提示，见[运行提示](./tips.md) |
| `promptSuggestionEnabled` | `true` | 一轮结束后是否生成下一句建议，见[建议补全](./suggestions.md) |
| `summarize_long_command_output` | `true` | 为模型标出长命令输出中省略的字节、整行和相关原文，见[发给模型的工具结果](./context-and-cost.md#发给模型的工具结果) |
| `editorMode` | `normal` | 设为 `vim` 时使用 vim 风格编辑，见[vim 模式](./vim-mode.md) |
| `hooks` | 无 | 工具调用前后执行的 hooks |
| `sandbox` | 无 | 在沙箱中运行 Bash 和 Python 命令，见[沙箱](./sandbox.md) |
| `shell` | 工具使用 Bash，手动终端保留原默认值 | 共用 Shell 配置，见下文 |
| `python` | 无 | 默认 Python 解释器，见[Python 解释器](#python-解释器) |
| `permissions` | 无 | `allow`、`ask`、`deny` 规则列表，见[权限](./permissions.md#规则) |
| `remoteControlAtStartup` | `false` | 交互会话启动时自动连接远程控制，见[远程控制](./remote-control.md#启动时自动连接) |
| `localCoordination.enabled` | `false` | 开启 Linux CLI 的本地协调，见[本地协调](./local-coordination.md) |
| `localCoordination.registry` | `true` | 开启本地协调后，自动登记 CLI 会话与常驻 Worker |
| `resourceMonitor` | 默认启用 | 内置宿主机 CPU、内存与磁盘压力监控，见[系统资源监控](#系统资源监控) |

`localCoordination.enabled` 和 `localCoordination.registry` 是 `localCoordination` 对象中的字段。嵌套写法见[启用登记](./local-coordination.md#启用登记)。

## 请求记录

在 `config/settings.json` 中设置 `"requestRecording": { "enabled": true }` 可开启原始模型请求与响应记录，设为 `false` 可显式关闭。默认关闭；`--full-access`（`--yolo`）在未显式配置时自动开启。

优先级是 `--record-requests` 强制开启 → `DEEPSEEK_CODE_RECORD_REQUESTS` 的有效值 → `requestRecording.enabled` → 完全访问模式自动开启。环境变量支持 `1`、`true`、`0`、`false`。请求体不脱敏，完整示例、保存位置与隐私说明见[请求记录](./request-recording.md)。Desktop 使用同一份数据目录配置。

## 流式模型请求

流式请求的读取空闲超时（`request_timeout_secs`）、连接池空闲时长（`pool_idle_timeout_secs`）和内容后超时恢复（`post_content_timeout_recovery`）在 `config/orchestration.toml` 的 `[http]` 段配置。默认分别为 `300` 秒、`300` 秒和 `false`，修改后需重启进程生效。完整配置示例见[流式请求超时与重试](./providers.md#流式请求超时与重试)。

## 记忆开关

运行 `/config` 可分别切换 Global、Project、Session、Team memory。前三项默认开启，Team 默认关闭。命令行用 `dcl config memory` 查看全部状态，例如 `dcl config memory team on` 只启用团队记忆；未绑定团队的会话仍不会收到团队索引。关闭某项只停止该作用域的说明与索引提醒，不改变文件权限或删除已有记忆。见[索引位置与可见范围](./memory.md#索引位置与可见范围)。

## 联网搜索与网页抓取代理

独立联网搜索（`deepseek_search`）与 `WebFetch` 代理（`web_fetch.proxy`）保存在 `config/config.json`，每次调用实时生效，无需重启：

```bash
dcl config set search.provider deepseek|openai|anthropic
dcl config set search.api_key sk-...
dcl config set search.base_url https://api.deepseek.com/anthropic/v1
dcl config set search.model deepseek-flash
dcl config set fetch.proxy http://127.0.0.1:10808   # 设为空字符串 "" 可清除
```

在交互会话中也可通过 `/search-config`、`/config search`、`/config fetch-proxy`，或在 `/config` 面板的 `Config` 页（`Web search` / `Web fetch proxy`）直接配置。详见[联网搜索与深度研究](./web-search.md)。

## 系统资源监控

dcl 与 Desktop 共用内置宿主机资源监控器，通过原生系统调用周期性采样 CPU、内存以及当前工作区所在磁盘的可用空间（不额外启动子进程）。持续超限时仅在**活动回合**（回合开始或工具结果边界）向模型注入一条 `<task-notification>`（`task-id` 为 `builtin-resource-monitor`）并向界面推送 `resource_alert` 警告；**会话空闲时不会唤醒模型或向队列写入输入**，回合开始前已恢复的短暂峰值会自动丢弃。

在 `config/settings.json` 中可通过 `resourceMonitor` 调整全部阈值（字段均为可选，缺失或格式非法时回退默认值）：

```json
{
  "resourceMonitor": {
    "enabled": true,
    "intervalSecs": 10,
    "cpuPercentThreshold": 95.0,
    "cpuConsecutive": 3,
    "memoryAvailablePercentThreshold": 10.0,
    "memoryAvailableMinBytes": 2147483648,
    "memoryConsecutive": 2,
    "diskAvailablePercentThreshold": 5.0,
    "diskAvailableMinBytes": 2147483648,
    "diskConsecutive": 2,
    "cooldownSecs": 300
  }
}
```

- **采样与冷却**：`intervalSecs` 限制在 `2`–`300` 秒；`cpuConsecutive`、`memoryConsecutive`、`diskConsecutive` 至少为 `1`；同类告警在 `cooldownSecs`（默认 `300` 秒）内不重复触发，且恢复需越过回差区间以防阈值抖动。
- **触发条件**：CPU 使用率达到 `cpuPercentThreshold`（有效范围 `0`–`100`，超出或非有限数时回退 `95.0`）；内存需**同时**低于可用百分比阈值与最小可用字节数（默认 `10%` 且 `< 2 GiB`）；磁盘在可用百分比或可用字节数**任一**低于阈值（默认 `5%` 或 `< 2 GiB`）时触发。
- **环境变量覆盖**：设置 `DEEPSEEK_CODE_RESOURCE_MONITOR=0`（或 `false`）可强制关闭，`1`（或 `true`）可强制开启，优先级高于 `settings.json`；非法值忽略并沿用文件配置。

## Shell 配置

`shell` 与其他设置共用 `config/settings.json`。模型工具读取 `toolDefault`，dcl 的 `!` 命令读取 `terminalDefault`；工具参数显式指定 `shell` 时优先。

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

`shell.toolDefault` 决定 `Bash` 和 `Monitor` 提示的默认 Shell。它们的 `shell` 参数只列出本机可用的选项。选择 Git Bash 时会看到 Unix 路径与路径转换提示，选择 PowerShell 或 cmd 时会看到对应语法，原生 POSIX Shell 直接使用其常规语法。

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

## Python 解释器

`Python` 工具在不传 `interpreter` 或 `conda` 时使用默认解释器。可以在 `config/settings.json` 中指定：

```json
{
  "python": {
    "path": "/usr/bin/python3"
  }
}
```

```powershell
dcl config set python.path /usr/bin/python3
dcl config set python.path ""        # 清除，恢复自动解析
dcl config show                      # 查看保存值
```

`python.path` 可以是绝对路径，也可以是 PATH 上的程序名。解析顺序是：

1. 工具参数 `interpreter`（绝对路径或 PATH 程序名）；
2. 工具参数 `conda` 指定的 conda 环境；
3. `config/settings.json` 的 `python.path`；
4. 环境变量 `VIRTUAL_ENV`；
5. 环境变量 `CONDA_PREFIX`；
6. 工作区的 `.venv`、`venv`、`env`；
7. PATH：Windows 先试 `py -3`，再试 `python3`、`python`。Windows 会跳过 `WindowsApps` 中的 Microsoft Store 占位程序。

`interpreter` 和 `conda` 互斥，同时传入会直接报错。显式路径不存在、环境名找不到或 PATH 上没有解释器时，工具会列出尝试过的候选并提示用 `Bash` 执行 `py -0p`、`conda env list` 或 `which python`。配置的路径失效不会回退到 PATH，而是明确报错，避免静默使用别的环境。

新会话的环境块会列出默认解释器的绝对路径和版本，和 Node.js 版本并列。工具结果每次仍带 `interpreter` 与 `interpreter_source`；模型预览只在解释器与请求不同，或工作区虚拟环境替换了默认解释器时多显示一行。

## 环境变量

| 变量 | 作用 | 文档 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_BASE_URL` | 覆盖 DeepSeek 接口地址 | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_CODE_DATA_DIR` | 数据目录 | [数据目录](./data-directory.md) |
| `DEEPSEEK_CODE_COORDINATION_DIR` | 本地协调目录 | [本地协调](./local-coordination.md) |
| `DEEPSEEK_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | 启用代理团队工具 | [代理团队](./agent-teams.md) |
| `DEEPSEEK_CODE_RESOURCE_MONITOR` | 覆盖内置系统资源监控开关（`0`/`1`/`true`/`false`） | [系统资源监控](#系统资源监控) |
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
| `--coordination-dir` | 本地协调目录 | [本地协调](./local-coordination.md) |
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
