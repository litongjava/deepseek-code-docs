# 状态查看

`/status` 显示当前会话、模型和各项服务的状态。

```text
Status

  Version:          3.1.0
  Session name:     修复登录页样式
  Session ID:       24c37af0-77e0-4bf8-afe2-5bab3403446b
  cwd:              /home/you/projects/web
  Data directory:   /home/you/.deepseek-code

  Provider:         deepseek (deepseek)
  Model:            deepseek-flash · /model
  API endpoint:     https://api.deepseek.com
  API key:          configured (not verified)
  Reachability:     not checked · /status --check
  Permission mode:  ask · Shift+Tab to cycle
  Routing:          selected provider

  Worker:           not started
  MCP servers:      1 running, 2 configured · /mcp
  Built-in tools:   48
  Language servers: 8 of 10 installed · /lsp
```

## 各项含义

**会话**

| 项目 | 说明 |
|---|---|
| Session name | 会话名，没有时提示用 `/rename` 命名 |
| Session ID | 用于 `dcl --resume <ID>` |
| cwd | 当前项目目录 |
| Data directory | 实际使用的[数据目录](./data-directory.md) |

**模型**

| 项目 | 说明 |
|---|---|
| Provider / Model | 当前使用的提供商和模型，见[模型与提供商](./providers.md) |
| API endpoint | 接口地址，只显示协议、主机和端口 |
| API key | `configured` 表示本地有凭据，**不代表已验证有效**；`missing` 表示没有配置 |
| Reachability | 默认不检查；`/status --check` 会探测接口的 HTTP 连通性，不发送凭据，也不发起模型请求 |
| Permission mode | 当前[权限模式](./permissions.md) |

**工具**

| 项目 | 说明 |
|---|---|
| Worker | 持久化后台进程的状态 |
| MCP servers | 正在运行和已配置的 MCP 服务数量。如果有已配置的服务，下方会逐个列出 |
| Built-in tools | 内置工具数量 |
| Language servers | 已安装的语言服务器数量，详细情况用 `/lsp` 查看 |

MCP 的"运行中"来自管理器的记录，dcl 不会为此向服务发送协议级的健康检查。

## 验证模型真的可用

`/status` 不会调用模型。要确认 API Key 有效、模型能正常回复，用 `/test`，它会发送一个很小的真实请求。
