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
| `--max-turns <n>` | 限制工具循环轮数 |
| `--json-schema <schema>` | 要求最终回复是符合该 JSON Schema 的 JSON，结果在 `json` 输出的 `structured_output` 字段；DeepSeek 见[结构化输出](./deepseek.md#结构化输出-json-schema) |
| `--permission-mode <mode>` | 权限模式 |
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

非交互模式没有人可以回答审批请求。默认的 `ask` 模式下，如果模型调用了需要审批的工具（例如写入长期记忆的 `memory_ingest`），这次调用会被**拒绝**，模型收到

```
Permission to use <tool> was not granted: no approval host is available in this session. Grant it with --allowed-tools or a permission mode.
```

并继续完成本轮回答，退出码为 0。需要让工具真正执行时，用 `--allowed-tools <工具>` 单独放行，或选择合适的 `--permission-mode`。

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

`run.err` 包含引擎日志（`INFO`/`ERROR`），排查接口错误时先看这里。
