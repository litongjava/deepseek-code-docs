# 代码审查与安全审查

dcl 内置两个只读的审查命令，都会先收集要审查的改动，再交给模型分析：

| 命令 | 关注点 |
|---|---|
| `/code-review` | 正确性回归、安全问题、数据丢失、取消与错误处理 |
| `/security-review` | 只看可利用的安全漏洞，与 Claude Code 的 `/security-review` 对应 |

## 用法

```text
/code-review
/security-review high
/security-review branch main
/code-review path "src/auth/login.ts"
/security-review pr 42
```

**审查深度**：`low`、`medium`（默认）、`high`、`xhigh`、`max`，也可以写成 `--effort LEVEL`。

**审查范围**：

| 写法 | 范围 |
|---|---|
| 不写，或 `workspace` | 已暂存和未暂存的改动，未跟踪的文件只列文件名 |
| `staged` | 只看已暂存的改动 |
| `branch REF` | 当前分支相对 REF 的改动 |
| `path "路径"` | 指定文件 |
| `pr 编号或链接` | GitHub PR，需要已登录的 `gh` |

## 审查方式

- **只读**：不修改文件，不运行测试或脚本，只用 Read、Grep、LSP 追踪调用关系。
- **不受改动内容影响**：改动内容、文件名和 PR 描述都被视为不可信的数据，不会被当作指令执行。
- **结果格式**：按严重程度排序，每条都给出文件和行号、触发场景和后果。安全审查还会说明攻击者能控制的输入、到达危险操作的路径和修复方向。
- **不凑数**：没有发现问题时如实说明，并列出覆盖到的范围。

`/security-review` 检查的漏洞类型：
- 注入：命令、SQL、路径、模板；
- 认证与授权绕过；
- 代码或日志中的密钥；
- 不安全的反序列化；
- SSRF、XSS；
- 弱加密或弱随机数；
- 安全检查中的竞态；
- 路径穿越与文件权限；
- 无上限输入导致的拒绝服务。
