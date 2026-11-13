# 请求记录

请求记录把会话中实际发给模型服务的 HTTP 请求和收到的原始响应保存到本机，适合排查模型请求失败、上下文压缩和工具调用问题。每次 HTTP 尝试单独保存，重试也有自己的记录。

::: warning 隐私与分享
请求体和响应正文**不脱敏**，可能包含完整对话、发给模型的文件内容、工具参数与工具结果，以及其中的密钥和个人信息。认证请求头（例如 `Authorization`、`Proxy-Authorization`、Cookie 和 API Key）会被移除，但这不代表整份记录已经脱敏。分享或上传前，请检查所有文件，只提供排查所需的内容。
:::

## 开启与关闭

默认关闭。只为本次 CLI 启动开启：

```bash
dcl --record-requests
```

也可以用于[非交互模式](./non-interactive.md)：

```bash
dcl --record-requests -p "总结当前目录的 README"
```

### 环境变量

`DEEPSEEK_CODE_RECORD_REQUESTS` 接受 `1`、`true` 表示开启，`0`、`false` 表示关闭；不区分大小写，忽略首尾空白，其他值按未设置处理。

Linux / macOS，变量只作用于该次启动：

```bash
DEEPSEEK_CODE_RECORD_REQUESTS=1 dcl
```

Windows PowerShell，变量作用于当前终端及随后启动的进程：

```powershell
$env:DEEPSEEK_CODE_RECORD_REQUESTS = '1'
dcl
```

关闭时将值改为 `0` 或 `false`。若要恢复由配置和启动参数决定，Linux / macOS 使用 `unset DEEPSEEK_CODE_RECORD_REQUESTS`，PowerShell 使用 `Remove-Item Env:DEEPSEEK_CODE_RECORD_REQUESTS -ErrorAction SilentlyContinue`。环境变量变更后需要重新启动应用及对应 Worker。

### settings.json

在[数据目录](./data-directory.md)的 `settings.json` 中加入以下设置；已有文件时合并字段，保留其他设置：

```json
{
  "requestRecording": {
    "enabled": true
  }
}
```

设为 `false` 可显式关闭。此项只读取数据目录中的设置，不读取项目目录中的同名字段。Desktop 使用同一份配置，具体步骤见 [Desktop 请求记录](../desktop/configuration/request-recording.md)。

### 优先级与完全访问

按以下顺序决定是否记录：

1. 带 `--record-requests` 时强制开启，即使环境变量或配置为 `false`。
2. 否则，环境变量中的有效值优先。
3. 否则，使用 `settings.json` 中 `requestRecording.enabled` 的布尔值。
4. 以上均未指定时，`--full-access`（别名 `--yolo`）自动开启；普通启动关闭。

因此，环境变量为 `0`、`false` 或配置为 `false`，可以关闭完全访问模式的自动记录；环境变量仍优先于配置。排查问题只需使用 `--record-requests`，无需切换[完全访问模式](./permissions.md#完全访问)。这些启动参数不会改写 `settings.json`。

## 查看记录

命令格式是 `dcl requests <会话ID>`，需要完整会话 ID。交互会话内可以用 `/copy-session-id` 复制，也可以从 [`/status`](./status.md) 查看；在终端运行 `dcl sessions list` 可列出已保存的会话。

Linux / macOS：

```bash
printf '粘贴会话 ID: '
read -r session_id
dcl requests "$session_id"
```

Windows PowerShell：

```powershell
$sessionId = Read-Host '粘贴会话 ID'
dcl requests $sessionId
```

命令按序号列出请求用途（`purpose`）、模型（`model`）、HTTP 状态（`HTTP`）、响应完成状态（`completed`），以及各文件的字节数和完整路径。这里的 `completed` 对应元数据中的 `stream_completed`，不表示整个会话或压缩任务已经完成。用文本编辑器打开对应文件查看正文；压缩记录 `compaction-*.json` 需要在输出的目录中另行打开。

查看时必须使用记录生成时的同一个数据目录；自定义目录可用 `--data-dir` 或 `DEEPSEEK_CODE_DATA_DIR` 指定。没有记录时显示 `No request records`，不会补录历史请求，也不会为查看而创建记录目录。会话已删除但记录目录仍存在时，仍可查看。

## 保存位置与文件

记录位于 `<数据目录>/request-records/<会话ID>/`。默认数据目录是 Linux / macOS 的 `~/.deepseek-code`、Windows 的 `%USERPROFILE%\.deepseek-code`。

同一次 HTTP 尝试的各个文件使用相同的文件名前缀 `NNNN-<请求ID>-aK`：`NNNN` 是会话内递增序号，至少四位；`K` 是尝试次数，从 `1` 开始，重试为 `a2`、`a3` 等，每次重试也分配新的会话内序号。恢复会话后继续编号，不覆盖已有文件。

- `.request.json`：实际发送的请求体，按发送时的字节保存，不脱敏、不重新排版。
- `.headers.json`：移除认证和可识别敏感信息后的请求头。
- `.sse.txt`：流式响应的原始字节，保留 SSE 事件及其顺序。使用二进制事件流的协议也按原始字节保存，不能仅凭扩展名判断为文本。
- `.response.json`：非流式响应或 HTTP 错误响应的原始正文；错误正文可能是纯文本或 HTML，不保证是有效 JSON。
- `.meta.json`：请求用途 `purpose`、提供商和模型、会话与请求 ID、尝试次数 `attempt`、HTTP 状态 `http_status`、开始与结束时间、完成状态 `stream_completed` 和错误信息。可由 `started_at` 与 `ended_at` 的差值判断该次尝试的耗时；未结束时结束时间为空。元数据中的 URL 会去掉查询参数、片段和用户名密码。

请求尚未收到响应时，可能没有响应文件，HTTP 状态也可能为空。取消或断流后会保留已收到的部分内容；判断是否完整时要结合元数据，HTTP 200 本身不代表响应完整。记录写入失败会记入诊断日志，不阻止模型请求继续；响应文件写入失败时，元数据还会尽可能保存 `recording_error`。因此，即使 `stream_completed` 为 `true`，也要检查是否存在记录写入错误，不能仅据此断言本地文件完整。

### 上下文压缩

开启记录后，摘要请求同样逐次保存，`purpose` 为 `compaction`。元数据中的 `compaction_stage`、`compaction_label` 可帮助区分分段摘要、合并、恢复和最终摘要；Responses 原生压缩请求也会记录。

每次压缩还会生成独立编号的 `compaction-NNNN.json`，包含触发原因、压缩前消息、压缩前 token 估算、开始与结束时间、完成状态、摘要和压缩后边界。`request_sequences` 关联这次压缩实际发出的请求序号，便于对照请求和响应；提交前取消或压缩未完成时，记录保持未完成状态。

这些文件也含未脱敏内容。压缩成功后导出的 Markdown 摘要与请求记录分别保存；压缩行为和摘要导出见[上下文用量与费用](./context-and-cost.md)。

## 自动清理

开始写入请求或压缩记录时会检查过期会话目录，检查间隔至少一小时。目录及其中直接子项的**最新修改时间超过 14 天**，且没有正在写入的记录时，整个会话记录目录会被自动删除。不是按会话创建时间计算，也不会在应用停止运行时定时清理。

需要长期保留的排查材料，请在到期前复制到其他目录，并按敏感数据保管。关闭记录只停止后续记录，不会立即删除已有文件。

## 排查时怎么用

- **模型请求失败或重试**：先用 `dcl requests <会话ID>` 找到对应序号，再对照元数据、请求体与原始响应，确认实际发送内容、HTTP 状态及各次尝试的结果。
- **上下文压缩异常**：打开 `compaction-*.json`，沿 `request_sequences` 查看摘要请求，核对压缩前消息、摘要和完成状态。
- **工具调用异常**：检查响应中模型返回的工具名称与参数，再看后续请求中的工具结果，结合[工具调用详情](./tool-calls.md)排查。

更多错误说明见[故障排查](./troubleshooting.md)。
