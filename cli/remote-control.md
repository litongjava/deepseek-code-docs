# 远程控制

远程控制把当前的交互会话注册到一个 Remote Control 服务上，你可以从另一台设备的客户端继续这个会话：发送提示词、审批工具调用、中断任务、切换权限模式。

## 连接

在交互模式中执行：

```text
/remote-control 我的会话 --server https://rc.example.com
```

- 服务端的 token 从环境变量 `CLAUDE_BRIDGE_OAUTH_TOKEN` 读取，dcl 不会使用 Anthropic 账号的登录凭据。
- 加 `--save` 会记住服务端地址，以后直接 `/remote-control` 即可连接；`/remote-control server` 查看，`/remote-control server clear` 清除。
- `/rc` 是简写。

连接成功后显示：

```text
Remote Control active: https://rc.example.com/code/session_...
Remote Control connected.
```

### 启动时自动连接

和 Claude Code 一样，在[数据目录](./data-directory.md)的 `settings.json` 中设置：

```json
{ "remoteControlAtStartup": true }
```

之后每个交互会话启动时都会连接到已保存（`--save`）的服务端，效果和手动执行 `/remote-control` 一样。这一项只从用户设置读取，项目里提交的设置文件不能让会话连接到远程服务。连接失败时打印错误，会话照常继续。

## 连接期间

**远程发来的提示词**：在本地输入框空闲时执行，本地也会显示 `Remote prompt: ...`。

**消息同步**：本地输入的提示词和模型的回复都会同步给远程客户端；每一轮结束时发送一个 `result` 事件，失败或被中断的一轮标记为 `is_error: true`。

**工具审批**：需要审批的调用会同时在本地和远程请求确认，哪一方先回答就以哪一方为准，另一方的提示随之取消。

**远程可以执行的操作**：
- 中断当前这一轮；
- 切换权限模式，本地会显示 `Remote Control set permission mode to ...`。

## 断开

`/remote-control status` 查看连接状态。再次执行 `/remote-control` 会显示连接地址，并询问是否断开：

```text
Disconnect Remote Control? [y/N] y
Remote Control disconnected.
```

断开后，远程会话被归档，注册的环境也会注销。退出 dcl 时会自动断开。

## 开发与测试

仓库里带有一个模拟服务端，可以在本机扮演 Remote Control 服务和远程客户端：

```bash
cargo run -p deepseek-code-core --example remote_control_mock -- 38090 my-token
```

```text
# 在 dcl 中（CLAUDE_BRIDGE_OAUTH_TOKEN=my-token）
/remote-control test --server http://127.0.0.1:38090
```

扮演远程客户端：

| 请求 | 作用 |
|---|---|
| `POST /mock/send` | 发送一个消息帧，例如用户提示词、审批结果、中断请求 |
| `GET /mock/state` | 查看 dcl 发来的全部事件 |
| `POST /mock/drop` | 断开所有客户端连接 |
| `POST /mock/fail` | 让接下来的若干次轮询失败，例如 `{"status":503,"count":2}` |

## Windows 开发 macOS 程序

远程构建、SSH 文件传输与 Mac 会话接入的完整步骤见[Windows 远程开发 macOS](./windows-macos-development.md)。
