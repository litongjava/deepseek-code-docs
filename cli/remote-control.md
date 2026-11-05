# 远程控制

远程控制让你从另一台设备继续当前的交互会话：发送提示词、审批工具调用、中断任务、切换权限模式。有两种连接方式：

- **经过 Remote Control 服务**：兼容 Claude Code 的 bridge 协议，远程端使用服务方提供的客户端，见下文[连接](#连接)。
- **dcl 直连**：不需要服务端，另一台机器上的 dcl 输入 IP、端口和 token 直接连接，看到并操作同一个完整的 dcl 界面，见[dcl 直连](#dcl-直连)。

两种方式下，命令执行和文件修改都发生在开启远程控制的这台机器上。

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

## dcl 直连

不需要 Remote Control 服务，也不需要 SSH。机器 B 看到并操作的是机器 A 上同一个 dcl 界面，A 上能用的功能在 B 上都能用：提示词、所有斜杠命令、审批菜单、快捷键、鼠标和粘贴。

**第一步：在机器 A 上开启监听**

```text
/remote-control listen
```

```text
Remote Control listening on 192.168.1.20:30086
Token: k3vq-7mxa-...-r2pd
On the other machine: dcl remote-control connect 192.168.1.20:30086
```

- 当前会话随即在 A 上以 `--resume` 继续，A 的本地终端照常使用，和 B 共用同一个输入框。
- 默认监听所有网卡的 `30086` 端口；用 `--port PORT` 换端口，用 `--host ADDR` 只监听某个地址，例如 `--host 127.0.0.1`。
- 同时开启多个监听实例时，给每个实例指定不同端口，或使用 `--port 0` 让系统分配空闲端口。以启动时打印的地址为准；客户端必须填写该实际端口。
- 显式指定的端口已被占用时，启动会报错，不会静默改用另一个端口。
- 每次开启都会生成新的 token，只显示这一次，也不会写入磁盘。
- 防火墙需要放行这个 TCP 端口。

也可以直接从命令行启动一个监听会话。例如在本机测试多个实例时，在不同终端分别运行：

```bash
dcl --data-dir ./data-a --rc listen --host 127.0.0.1 --port 0
dcl --data-dir ./data-b --rc listen --host 127.0.0.1 --port 0
```

每个监听会话有自己的地址和 token。`127.0.0.1` 只接受本机连接；跨设备使用时需要选择可被另一台设备访问的监听地址，并配置防火墙。

**第二步：在机器 B 上连接**

```bash
dcl remote-control connect 192.168.1.20:30086
```

按提示输入 token，或者用 `--token` 参数、环境变量 `DCL_REMOTE_CONTROL_TOKEN` 传入。省略端口时使用 `30086`。`dcl rc connect` 是简写。

连接后，B 会先收到完整的会话画面（包括之前的对话和滚动历史），之后两边同步显示。命令执行和文件修改发生在 A 上。

**断开与重连**

- 在 B 上按 `Ctrl+]` 断开。会话继续在 A 上运行，包括正在进行的任务；再次执行 `dcl remote-control connect` 即可回到同一个会话。
- 网络中断后可以直接重连：新的连接会替换掉旧的。
- 客户端连接和断开时，A 上会显示提示。
- 在 A 或 B 上执行 `/remote-control disconnect`，会停止监听并断开客户端，会话继续在 A 上运行；`/remote-control listen` 重新开启，会生成新的 token。
- `/remote-control status` 显示监听地址和当前客户端。
- 在任一端执行 `/exit` 会结束会话，B 会显示 `The session ended on the host.`。

**终端大小**：A 和 B 的终端大小不同时，界面按较小的一方显示。

**安全**

连接使用 Noise 协议（`Noise_NNpsk0_25519_ChaChaPoly_BLAKE2s`）加密，token 作为预共享密钥：token 不在网络上传输，token 错误时握手直接失败。同一时间只有一个客户端。拿到 token 的人可以在 A 上执行任意命令，请只通过可信渠道传递；不用时执行 `/remote-control disconnect`。

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
