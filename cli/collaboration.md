# 协作：团队同步、远程控制与多会话

本页介绍同一台或多台机器上的多个 `dcl` 进程如何协作。下面的命令都在本机实测过，测试时启动了多个独立进程，每个进程用 `--data-dir` 隔离数据目录。

| 功能 | 用途 | 网络 |
|---|---|---|
| 团队同步（`team-sync`） | 在团队成员之间同步显式共享的团队记忆 | 自部署的 HTTP 服务 |
| 远程控制（`/remote-control`） | 从远程客户端继续一个交互式会话 | 配置的 Remote Control 服务 |
| 会话消息（`SendMessage`） | 同一项目内的会话之间互发消息 | 无，经由本地数据库 |
| 代理团队（`TeamCreate` / `TeamSpawn`） | 一个会话带领多个并发的子代理 | 无 |

## 团队同步

### 启动服务端

服务端由运维提供 token 到团队的映射，token 至少 16 个字符，每个 token 只能访问一个团队。默认只绑定回环地址；生产环境请放在 HTTPS 反向代理之后。

```bash
export TEAM_SERVER_TOKENS='{"tok-engineering-0001":"engineering"}'
dcl --data-dir ~/team-server team-sync serve --bind 127.0.0.1:38080
```

### 客户端

每个成员用自己的数据目录登录，`auth` 会先实际请求一次服务端验证 token，通过后才保存配置：

```bash
export TEAM_SYNC_TOKEN=tok-engineering-0001
dcl --data-dir ~/client-a team-sync auth engineering --endpoint http://127.0.0.1:38080
dcl --data-dir ~/client-a team-sync create 'Architecture' --content 'Use Rust' --tags decision,backend
dcl --data-dir ~/client-a team-sync sync

dcl --data-dir ~/client-b team-sync auth engineering --endpoint http://127.0.0.1:38080
dcl --data-dir ~/client-b team-sync sync
dcl --data-dir ~/client-b team-sync list
```

- `update <id> TITLE --content ...` 省略 `--tags` 时保留原有标签；要清空标签，传 `--tags ''`。
- 两端同时修改同一条记忆时，后同步的一方会得到冲突。用 `team-sync conflicts` 查看双方版本，用 `team-sync resolve <id> --keep local|remote` 选择保留哪一方，然后再执行一次 `sync`。
- 删除以墓碑记录传播，其他成员同步后 `list` 不再显示该条，`list --include-deleted` 仍能看到。
- `team-sync context --enabled true` 允许当前项目把团队记忆发给模型，之后模型可以回答团队记忆里的内容。
- 后台定时同步：`dcl services start team-sync --interval 60`，用 `services status` 查看状态，用 `services stop team-sync` 停止。

## 远程控制

在交互模式中执行：

```text
/remote-control 我的会话 --server https://rc.example.com
```

- 服务端的 token 从环境变量 `CLAUDE_BRIDGE_OAUTH_TOKEN` 读取；加 `--save` 会记住服务端地址。
- 连接后，远程客户端发来的提示词会在本地输入框空闲时执行；本地输入的提示词和回复也会同步给远程客户端。每轮结束都会发送一个 `result` 事件，失败或被中断的一轮标记为 `is_error: true`。
- 需要审批的工具调用会同时在本地和远程请求确认，先给出答复的一方生效。
- 远程客户端可以中断当前这一轮，也可以切换权限模式。
- 再次执行 `/remote-control` 会显示连接地址，并询问是否断开。断开后，远程会话被归档，环境也会注销。

开发时可以用仓库自带的模拟服务端代替真实服务：

```bash
cargo run -p claude-core --example remote_control_mock -- 38090 my-token
# 在 dcl 中：/remote-control test --server http://127.0.0.1:38090
# 扮演远程客户端：POST /mock/send 发送消息帧，GET /mock/state 查看收到的事件
```

## 会话消息

同一项目、同一数据目录下的会话，可以用 `SendMessage` 工具互发消息，例如一个终端里的 REPL 和另一个终端里的 `dcl -p`：

- `operation=peers` 列出可以发送消息的会话，`operation=send` 按会话 UUID 发送。
- 接收方正在执行一轮时，消息在下一个安全的模型边界进入上下文。接收方空闲时，返回结果为 `delivery: next_recipient_turn`：会话开着就会提示用户，消息在它下一轮进入上下文；会话已关闭则在恢复时读取。不要替一个可能在别处打开的会话执行恢复。
- 在 ask 模式下，`SendMessage` 和其他工具一样需要先确认。

## 代理团队

代理团队目前是实验功能，需要设置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`：

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 dcl -m deepseek-flash --api-format anthropic \
  --permission-mode bypass \
  -p "TeamCreate 团队 docs；TeamSpawn 两个成员 alice、bob，分别写 alice.txt 和 bob.txt，bob 写完用 SendMessage 通知 alice；最后 TeamDelete。"
```

- `TeamSpawn` 让各成员并发运行。每个成员有独立的子会话，权限与队长相同；成员之间可以按名字用 `SendMessage` 发消息。
- 在 DeepSeek 两种协议下都实测通过。旧版本会把成员列表参数解析成空对象，报 `team_name is required`，见[故障排查](./troubleshooting.md#teamspawn-报-team-name-is-required)。
