# MCP 服务

MCP（Model Context Protocol）服务给模型提供额外的工具和提示词，例如访问数据库、浏览器或公司内部系统。dcl 和 Claude Code 一样支持四种连接方式：本地进程（stdio）、Streamable HTTP、旧版 HTTP+SSE 和 WebSocket。

## 添加服务

本地进程：名称后面是启动命令和参数。

```bash
dcl mcp add filesystem npx -y @modelcontextprotocol/server-filesystem .
```

远程服务：用 `--transport` 指定 `http`、`sse` 或 `ws`，名称后面是地址；`--header`（`-H`）添加请求头，可以重复。

```bash
dcl mcp add --transport http docs https://mcp.example.com/mcp --header "Authorization: Bearer $TOKEN"
dcl mcp add --transport sse legacy https://mcp.example.com/sse
dcl mcp add --transport ws live wss://mcp.example.com/ws
```

`--transport` 也接受 `streamable-http`（等同 `http`）和 `websocket`（等同 `ws`）。

其他管理命令：

| 命令 | 作用 |
|---|---|
| `dcl mcp list` | 列出已配置的服务 |
| `dcl mcp remove 名称` | 删除服务 |
| `dcl mcp restart 名称` | 重启服务 |

交互模式里 `/mcp` 打开管理菜单：查看每个服务的状态（已连接及工具数、失败原因、已停用），选中后可以查看工具、重新连接、停用或启用，见[交互界面](./interface.md)。

## 配置文件

服务保存在[数据目录](./data-directory.md)的 `mcp-servers.json` 中，格式和 Claude Code 的 `mcpServers` 一致，可以直接编辑：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "env": { "DEBUG": "1" }
    },
    "docs": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer xxx" }
    }
  }
}
```

| 字段 | 说明 |
|---|---|
| `command`、`args`、`env`、`cwd` | 本地进程的启动方式 |
| `type` | `stdio`（默认）、`http`、`sse`、`ws` |
| `url`、`headers` | 远程服务的地址和请求头 |
| `enabled` | 设为 `false` 停用，默认 `true` |

- **Streamable HTTP**：每条消息一个 POST，回复可以是 JSON 或事件流；dcl 会保留服务端返回的 `Mcp-Session-Id`。
- **HTTP+SSE**：一个 GET 事件流接收回复，消息 POST 到服务端告知的地址。
- 四种方式共用同一个请求循环，服务端发来的请求（例如向用户索取信息的 elicitation）在每种方式下都会得到回应。

## 使用服务的工具

服务的工具以 `mcp__服务名__工具名` 的名字提供给模型。调用时和其他工具一样经过[权限检查](./permissions.md)，可以用规则放行或拒绝，例如：

```text
/permissions allow mcp__docs__search
```

## 服务的提示词

服务提供的 prompt 和 Claude Code 一样作为斜杠命令出现：`/mcp__服务名__提示词名`。

```text
/mcp__github__review 42 重点看错误处理
```

- 后面的词按顺序填入提示词的参数，最后一个参数接收剩下的整段文字。上例中 `pr` 为 `42`，`focus` 为"重点看错误处理"。
- 缺少必填参数时提示 `Missing required argument(s): ...`；名称写错时列出所有可用的 MCP 提示词。
- 服务端返回的内容作为这一轮的提示词发送给模型。

## CodeGraph

运行 `dcl init-env codegraph` 可安装、初始化当前项目并添加 MCP，详见[初始化开发环境](./environment-init.md)。
