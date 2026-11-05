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
| `permissions` | 无 | `allow`、`ask`、`deny` 规则列表，见[权限](./permissions.md#规则) |
| `remoteControlAtStartup` | `false` | 交互会话启动时自动连接远程控制，见[远程控制](./remote-control.md#启动时自动连接) |

这两个开关和 Claude Code 的同名设置含义一致。

## 环境变量

| 变量 | 作用 | 文档 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_BASE_URL` | 覆盖 DeepSeek 接口地址 | [接入 DeepSeek](./deepseek.md) |
| `DEEPSEEK_CODE_DATA_DIR` | 数据目录 | [数据目录](./data-directory.md) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | 启用代理团队工具 | [代理团队](./agent-teams.md) |
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
