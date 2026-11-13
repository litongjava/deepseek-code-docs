# 请求记录

Desktop 可以把会话中发给模型的 HTTP 请求与原始响应保存到本机，用于排查模型请求、上下文压缩和工具调用问题。默认关闭；与 CLI 使用同一数据目录时，两者读取同一份 `settings.json`。

::: warning 隐私与分享
请求体和响应正文不脱敏，可能包含完整对话、发给模型的文件内容、工具参数与结果。认证请求头会被移除，但正文中的密钥和个人信息仍可能保留。分享前请检查所有文件，只提供必要内容。
:::

## 在 Desktop 中开启

1. 找到 Desktop 实际使用的[数据目录](../maintenance/data.md#数据位置)。默认是 Linux / macOS 的 `~/.deepseek-code`、Windows 的 `%USERPROFILE%\.deepseek-code`；设置过 `DEEPSEEK_CODE_DATA_DIR` 时使用该目录。
2. 编辑其中的 `settings.json`，合并以下字段。文件不存在时可新建，已有其他设置时不要覆盖整份文件。
3. 保存后发送一条新消息，在数据目录的 `request-records` 中检查对应会话目录。

```json
{
  "requestRecording": {
    "enabled": true
  }
}
```

保存后用一条新消息验证设置是否生效；已发出的请求不会补录。Desktop 为后续模型请求准备记录选项时读取此设置；它属于应用数据目录配置，不是浏览器或桌面窗口的外观偏好。关闭时将 `enabled` 改为 `false`，已有记录不会立即删除。

如果 Desktop 进程设置了 `DEEPSEEK_CODE_RECORD_REQUESTS`，环境变量的有效值优先于文件配置：`1`、`true` 开启，`0`、`false` 关闭。也可以从终端直接开启：

Linux / macOS：

```bash
DEEPSEEK_CODE_RECORD_REQUESTS=1 dcd
```

Windows PowerShell：

```powershell
$env:DEEPSEEK_CODE_RECORD_REQUESTS = '1'
dcd
```

使用环境变量时，先退出正在运行的应用及对应 Worker，再从设置了变量的终端启动。变量只影响继承该环境的进程，从桌面快捷方式启动未必会继承终端变量。完整优先级及移除变量的方法见 [CLI 请求记录](../../cli/request-recording.md#开启与关闭)。

## 查看与保留

记录保存在 `<数据目录>/request-records/<会话ID>/`，每次 HTTP 尝试独立编号。请求体、过滤后的请求头、原始响应及元数据分别存放；上下文压缩还会保存摘要请求与 `compaction-*.json` 压缩记录。

安装了 CLI 时，在终端运行 `dcl sessions list` 查找会话 ID，再用 `dcl requests <会话ID>` 列出请求及文件路径。CLI 必须指向 Desktop 使用的同一个数据目录。也可以直接打开记录目录中的文件；文件命名、完成状态和排查步骤见 [CLI 请求记录](../../cli/request-recording.md#保存位置与文件)。

超过 14 天未修改、且没有正在写入记录的会话目录会在后续写入时自动清理，清理检查间隔至少一小时。需要长期保留时提前复制到其他目录；备份整个应用数据目录也会包含这些敏感记录，见[数据备份](../maintenance/data.md#备份步骤)。
