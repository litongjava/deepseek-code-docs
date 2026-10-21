# 故障排查

## `dcl -p` 一直没有输出

**现象**：在代理工具或脚本中运行 `dcl -p "..."`，进程长时间无输出也不退出。

**原因**：stdin 不是终端时 `dcl` 会读取 stdin 作为补充输入。旧版本会一直读到 EOF，父进程不关闭管道就会永久阻塞。

**处理**：当前版本最多等待 3 秒首个字节，详见[非交互模式](./non-interactive.md#标准输入)。没有输入时用 `< /dev/null` 运行。

## `-p` 报错 Tool permission interrupted the turn

**现象**：旧版本在 `-p` 模式下，模型一旦调用需要审批的工具，整轮就失败，退出码 1：

```
Error: Engine execution failed: Tool permission interrupted the turn: Tool approval required but no approval host ...
```

**处理**：当前版本改为拒绝这次调用，模型会继续回答，见[非交互模式 · 权限](./non-interactive.md#权限)。

## tool_use ids were found without tool_result

**现象**：使用 DeepSeek Anthropic 兼容接口时，模型一次调用两个以上工具后请求失败：

```
Model API error 400: messages.2:`tool_use` ids were found without `tool_result` blocks immediately after: call_01_...
```

**原因**：旧版本把每个工具结果放进单独的 user 消息。Anthropic 官方接口会合并相邻同角色消息，DeepSeek 不会，于是第二个 `tool_use` 被判定为缺少结果。

**处理**：升级到包含该修复的版本。当前版本把同一轮的工具结果放进一条 user 消息，并在每次请求前合并相邻同角色消息。

## 构建报错 `alsa-sys` 或 `unable to find library -lxdo`

缺少 `libasound2-dev` 或 `libxdo-dev`。安装对应包；没有 root 权限时见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 构建报错 `failed to create directory .../registry/cache`

共享的 `CARGO_HOME` 不可写。设置 `CARGO_HOME=~/.cargo` 并复制镜像源配置，见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。
