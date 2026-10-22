# dcl 概览

`dcl` 是 DeepSeek Code 的命令行版本。它和 Desktop（`dcd`）共用同一个 Rust 引擎、会话数据库、权限规则和工具实现，但**不依赖** Desktop 进程，可以单独在终端、SSH 会话、CI 和其他编码代理里运行。

## 五分钟上手

```bash
export DEEPSEEK_API_KEY=sk-...                       # 只放在环境变量里
export DEEPSEEK_BASE_URL=https://api.deepseek.com/anthropic

dcl -m deepseek-flash --api-format anthropic          # 交互模式
dcl -m deepseek-flash --api-format anthropic -p "总结 README" < /dev/null   # 一次性任务
```

进入交互模式后，直接用自然语言描述任务。模型会读代码、改文件、运行命令；需要你确认的操作会先询问。

## 功能地图

| 主题 | 文档 |
|---|---|
| 从源码构建 `dcl` | [安装与构建](./install.md) |
| 使用 DeepSeek 官方接口 | [接入 DeepSeek](./deepseek.md) |
| 保存和切换模型提供商 | [模型与提供商](./providers.md) |
| 会话和配置存在哪里 | [数据目录](./data-directory.md) |
| 所有可调的设置项 | [设置项参考](./settings.md) |
| 输入框、快捷键、运行中的操作 | [交互界面与快捷键](./interface.md) |
| 工具调用的显示、展开详情、改动汇总 | [工具调用与改动详情](./tool-calls.md) |
| 哪些操作需要确认、怎样放行 | [权限模式与工具审批](./permissions.md) |
| 先调查、后动手 | [计划模式](./plan-mode.md) |
| 用模型自动判断是否放行 | [自动权限模式](./auto-mode.md) |
| 下一句该说什么 | [建议补全](./suggestions.md) |
| 运行时的小提示 | [运行提示](./tips.md) |
| 当前会话、模型、服务的状态 | [状态查看](./status.md) |
| 回复被截断时怎么办 | [输出上限与自动续写](./output-limit.md) |
| 跳转定义、查引用、诊断 | [语言服务器（LSP）](./lsp.md) |
| 在脚本和 CI 中使用 | [非交互模式](./non-interactive.md) |
| 让结果是合法 JSON | [结构化输出](./structured-output.md) |
| 团队共享记忆 | [团队同步](./team-sync.md) |
| 从另一台设备继续会话 | [远程控制](./remote-control.md) |
| 会话之间互发消息 | [会话消息](./session-messages.md) |
| 一个会话带多个子代理 | [代理团队](./agent-teams.md) |
| 完整的实战过程 | [用 dcl 修复开源项目 Issue](./case-qwerty-learner.md) |
| 遇到错误 | [故障排查](./troubleshooting.md) |

## 常用命令

| 命令 | 作用 |
|---|---|
| `dcl` | 启动交互式会话 |
| `dcl -p "<任务>"` | 执行一次任务，结果输出到 stdout |
| `dcl --continue` | 继续当前目录最近的会话 |
| `dcl --resume <ID>` | 恢复指定会话 |
| `dcl sessions list` | 列出保存的会话 |
| `dcl lsp` | 查看语言服务器状态 |
| `dcl --help` | 查看全部参数 |

交互模式里输入 `/` 会列出全部斜杠命令，`/help` 查看说明。
