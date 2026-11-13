# 非交互模式与自动化

`-p`（`--print`）让 `dcl` 执行一轮完整的工具循环后退出，适合脚本、CI，或由其他编码代理调用。

## 基本用法

```bash
dcl -m deepseek-flash --api-format anthropic -p "总结 README 的安装步骤" < /dev/null
```

常用参数：

| 参数 | 作用 |
|---|---|
| `-C, --path <dir>` | 项目目录，默认当前目录 |
| `--output-format text\|json\|stream-json` | 输出格式；`stream-json` 每行一个事件 |
| `--verbose` | 输出更多事件（配合 `stream-json` 记录完整过程） |
| `--max-turns <n>` | 限制工具循环轮数；默认不限，模型一直工作到完成任务 |
| `--json-schema <schema>` | 要求最终回复是符合该 JSON Schema 的 JSON，结果在 `json` 输出的 `structured_output` 字段；见[结构化输出](./structured-output.md) |
| `--permission-mode <mode>` | 权限模式，见[权限模式与工具审批](./permissions.md) |
| `--allowed-tools <规则>` | 本次启动无需确认即可使用的工具 |
| `--dangerously-skip-permissions` | 跳过交互式确认；显式 deny 规则仍生效。只在隔离环境中使用 |

## 标准输入

stdin 不是终端时，`dcl` 会读取 stdin 并追加到提示词之后：

```bash
git diff | dcl -p "审查这段改动" 
```

如果父进程保持 stdin 管道打开却一直不写入（常见于代理工具、CI runner、IDE 任务），`dcl` 最多等待 **3 秒**首个字节，超时后在 stderr 输出

```
Warning: no stdin data received in 3s, proceeding without it; redirect stdin from /dev/null to skip this wait
```

并只使用命令行提示词继续。一旦收到首个字节，就会一直读到 EOF，不设超时。确定没有输入时，使用 `< /dev/null` 可以跳过这 3 秒等待。

## 权限

非交互模式没有人可以回答审批请求。默认的 `ask` 模式下，如果模型调用了需要审批的工具（例如修改文件的 `Edit`、运行非只读命令的 `Bash`、访问新网站的 `WebFetch`），这次调用会被**拒绝**，模型收到

```
Permission to use <tool> was not granted: no approval host is available in this session. Grant it with --allowed-tools or a permission mode.
```

并继续完成本轮回答，退出码为 0。需要让工具真正执行时，用 `--allowed-tools <工具>` 单独放行，或选择合适的 `--permission-mode`。

读写长期记忆（`memory_search`、`memory_ingest`）、待办和任务列表这类只影响 dcl 自身状态的工具和 Claude Code 一样不需要审批，`-p` 模式下也会直接执行。

## 压缩会话

`/compact` 在 `-p` 模式下也能用，和 Claude Code 一样直接压缩会话，不发给模型：

```bash
dcl -c -p "/compact 保留接口设计的讨论" < /dev/null
```

- 通常配合 `-c`（继续最近的会话）或 `--resume <ID>` 使用；后面的文字是可选的压缩要求。
- 文本输出显示压缩了多少条消息；`json`、`stream-json` 输出一个成功的 `result`。之后继续这个会话时，已调用的技能内容仍然保留。

## 记录完整过程

```bash
dcl -m deepseek-flash --api-format anthropic \
  --output-format stream-json --verbose --max-turns 60 \
  -p "$(cat task.md)" < /dev/null > run.jsonl 2> run.err
```

`run.jsonl` 中常用事件：

| `type` | 含义 |
|---|---|
| `tool_start` | 工具调用开始，含 `name` 和 `input` |
| `tool_result` | 工具结果，含 `is_error` 和 `output` |
| `error` | 请求或引擎错误 |
| `result` | 最终结果，含 `is_error`、`result`、`session_id` 和用量 |

`stream-json` 同时输出参考协议的 `system`、`assistant`、`user`、`result` 消息，SDK 和多轮会话的用法见 [SDK 与 stream-json 协议](./sdk.md)。

`run.err` 包含引擎日志（`INFO`/`ERROR`），排查接口错误时先看这里。

需要核对实际发给模型的请求体、原始响应和每次 HTTP 重试时，可以加上 `--record-requests`。记录单独保存在数据目录的 `request-records/<会话ID>/`，用 `result.session_id` 对应的 ID 运行 `dcl requests <会话ID>` 查看。正文不脱敏，具体用法与分享前的检查说明见[请求记录](./request-recording.md)。
