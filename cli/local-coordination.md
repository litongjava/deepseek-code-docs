# 本地协调与运行中的会话

在 Linux 上，可以让同一台机器上的 dcl 会话登记到同一个本地协调目录，再用 `dcl sessions live` 查看参与登记的 CLI 会话及其常驻 Worker。列表可用于确认同一会话有哪些前台和执行端、它们在哪个工作区、正在运行还是空闲。本地协调当前只提供可见性，多个实例仍应按[并行使用说明](./data-directory.md#同时运行多个实例)安排各自的任务。

## 启用登记

在要参与登记的 dcl [数据目录](./data-directory.md)下，把以下配置加入 `config/settings.json`，然后重新启动 dcl：

```json
{
  "localCoordination": {
    "enabled": true
  }
}
```

`localCoordination.enabled` 默认是 `false`。`localCoordination.registry` 默认是 `true`，将它设为 `false` 可关闭自动登记。已经运行的 Worker 可能仍登记在原来的协调目录里。

协调目录独立于 `--data-dir` 和 `DEEPSEEK_CODE_DATA_DIR`。按以下顺序选取，先找到的生效：

1. `--coordination-dir <目录>`。
2. 环境变量 `DEEPSEEK_CODE_COORDINATION_DIR`。
3. `~/.deepseek-code/coordination/v1`。

相对路径以启动 dcl 时所在的目录为准，即使同时用了 `-C`。不同协调目录各有一份列表。使用自定义目录时，启动会话和查看列表的命令都应指向同一个目录。

登记仅支持 Linux CLI 及其常驻 Worker。Desktop 会话不在列表覆盖范围内。macOS 上的命令仅提供只读查看，原生运行尚未验证。Windows 不支持登记或查看，Android 应用内的运行环境尚未验证。

## 查看会话

```bash
dcl sessions live
dcl sessions live --json
dcl --coordination-dir "$HOME/dcl-coordination" sessions live --json
```

例如，从一个终端用 `dcl --coordination-dir "$HOME/dcl-coordination"` 启动会话，再从另一个终端运行上面的第三条命令。`sessions live` 是只读查看，即使未启用登记也能运行。协调目录尚无登记时，文本输出显示 `No live local sessions.`，JSON 返回空的 `groups`。`sessions list` 和 `sessions show` 仍用于查看保存的会话与消息。

文本视图按会话分组，显示参与者角色、PID、活动状态、进程状态、心跳、工作区和分支。异常退出的实例记录仍可能显示为 `gone` 或 `unknown`，可结合心跳判断；`unresponsive` 只表示心跳超出时限。`--json` 输出一个 JSON 对象，含 `format_version`（当前为 `1`）、`groups`（含完整会话与实例 ID）和 `truncated`。两种输出都最多显示 100 个参与者。

## 查看失败

命令失败时以非零状态退出，并在 stderr 输出 `Local coordination unavailable: <类别>. No state was reset.`。登记失败时，dcl 会发出提示并继续当前会话，此实例可能不会出现在列表中。

| 类别 | 含义 |
|---|---|
| `busy` | 登记暂时繁忙，可稍后重试。首次并发初始化时，等待建库锁最多 15 秒；普通 SQLite 锁等待最多 2 秒 |
| `unsupported_schema` | 当前 dcl 无法读取这种登记格式 |
| `corrupt` | 登记已损坏或状态不完整 |
| `missing_database` | 找到登记目录的标记，但缺少登记数据库 |
| `domain_mismatch` | 登记内容与所选协调目录不匹配 |
| `unavailable` | 其他访问或配置问题，例如路径不可用或当前平台不支持登记 |
