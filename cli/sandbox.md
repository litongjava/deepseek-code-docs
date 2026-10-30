# 沙箱

开启沙箱后，模型通过 `Bash` 运行的命令和 Claude Code 一样在操作系统级的隔离环境中执行：除了项目目录和临时目录，文件系统只读；网络可以完全关闭，或只允许访问指定域名。沙箱默认关闭。

| 平台 | 实现 |
|---|---|
| Linux | bubblewrap（`bwrap`），需要先安装，例如 `apt install bubblewrap` |
| macOS | 系统自带的 `sandbox-exec`（尚未在 macOS 上实测） |
| Windows | 不支持；开启后命令会报错，需要把 `sandbox.enabled` 设回 `false` |

## 开启

在设置文件中加入：

```json
{
  "sandbox": {
    "enabled": true
  }
}
```

设置按以下顺序合并，后面的覆盖前面的：

1. [数据目录](./data-directory.md)的 `settings.json`（用户设置）；
2. 项目的 `.claude/settings.json`；
3. 项目的 `.claude/settings.local.json`。

`network.allowedDomains` 和 `network.deniedDomains` 两个列表例外：三处的内容会累加。

## 文件系统

沙箱中，整个文件系统只读，只有以下位置可写：

- 项目目录；
- 系统临时目录；
- `sandbox.filesystem.allowWrite` 中列出的路径。

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": { "allowWrite": ["/home/you/.cache/pip"] }
  }
}
```

## 网络

| 设置 | 效果 |
|---|---|
| 不设置 `network` | 网络和平时一样 |
| `"network": "deny"` | 完全断网 |
| `network.allowedDomains` | 只能访问列出的域名，其他域名需要你批准 |
| `network.deniedDomains` | 列出的域名一律拒绝，优先于允许列表 |

```json
{
  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "deniedDomains": ["bad.npmjs.org"]
    }
  }
}
```

- `*.example.com` 匹配所有子域名，但不匹配 `example.com` 本身。
- 权限规则中的 `WebFetch(domain:...)` 放行规则也会加入允许列表，和 Claude Code 一样。
- 命令本身没有网络，只能通过 dcl 在本机启动的过滤代理（HTTP/CONNECT）访问外部；dcl 会为命令设置 `HTTP_PROXY`、`HTTPS_PROXY`。不经过代理的连接会失败。

命令访问允许列表之外的主机时，dcl 在输入框的位置询问：

```text
Network request outside of sandbox
  Host: pypi.org
───────────────────────────────────────────
 Do you want to allow this connection?
 ❯ 1. Yes
   2. Yes, and don’t ask again for pypi.org
   3. No
```

- 选第 2 项会把 `WebFetch(domain:pypi.org)` 写入项目的 `.claude/settings.local.json`，之后自动加入允许列表。
- 没有人可以回答时（例如 `-p` 模式），这个主机被拒绝。被拒绝的请求返回 403，`Bash` 的结果会列出被拦截的主机，模型可以据此请你放行，而不是反复猜测。
- 配置了允许列表时，同一轮里的多个 `Bash` 调用依次执行，以便逐个询问。

## 在沙箱之外运行

某些命令确实需要在沙箱外运行（例如要写入系统目录）。模型可以在 `Bash` 调用中设置 `dangerouslyDisableSandbox: true`，这条命令就不使用沙箱，仍然照常经过[权限检查](./permissions.md)。

不想允许这样做时，设置：

```json
{ "sandbox": { "enabled": true, "allowUnsandboxedCommands": false } }
```

此后这类调用会直接失败。

以 `--full-access` 启动时，所有命令都在沙箱之外运行，见[完全访问](./permissions.md#完全访问)。

## 常见错误

| 错误 | 处理 |
|---|---|
| `The sandbox is enabled but bubblewrap (bwrap) is not installed` | 安装 bubblewrap，或关闭沙箱 |
| `The sandbox is enabled but is not supported on this platform` | 当前平台（Windows）不支持，关闭沙箱 |
| `Running commands outside the sandbox is disabled by sandbox.allowUnsandboxedCommands` | 设置禁止了在沙箱外运行 |
