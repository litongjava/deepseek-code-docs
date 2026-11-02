# 语言服务器（LSP）

dcl 内置一个 LSP 客户端，模型可以用 `LSP` 工具做跳转定义、查找引用、查看文档符号和诊断。真正分析代码的是各语言的**语言服务器**，它们是本机上独立安装的程序。dcl 需要时启动它们，闲置 60 秒后自动关闭。

没有语言服务器时，模型仍然可以靠读代码、搜索和编译测试完成工作，LSP 只是让它更快、更准。

## 查看状态：`/lsp`

```text
❯ /lsp
Language servers (used by the LSP tool for definitions, references and diagnostics)
  ✓ Rust                   rust-analyzer                /usr/local/cargo/bin/rust-analyzer
  ✓ Python                 pylsp                        ~/.deepseek-code/lsp/python/bin/pylsp
  ✓ TypeScript/JavaScript  typescript-language-server   ~/.deepseek-code/lsp/node/node_modules/.bin/...
  ✗ C/C++                  clangd                       not installed · sudo apt install clangd
  ✓ Java                   jdtls                        ~/.deepseek-code/lsp/jre/bin/java
  ✗ C#                     csharp-ls                    not installed · /lsp install csharp
From plugins:
  ✓ rust-analyzer-lsp@claude-plugins-official:rust-analyzer  rust-analyzer  .rs
Managed installs: ~/.deepseek-code/lsp
```

命令行里也可以用 `dcl lsp`。

## 支持的语言

| 语言 | 文件 | 服务端 | 一键安装方式 | 前提 |
|---|---|---|---|---|
| Rust | `.rs` | rust-analyzer | `rustup component add rust-analyzer` | rustup |
| Python | `.py` | pylsp | 独立虚拟环境中安装 python-lsp-server | uv 或 Python 3（含 venv） |
| TypeScript / JavaScript / React | `.ts` `.tsx` `.js` `.jsx` `.mts` `.cts` `.mjs` `.cjs` | typescript-language-server | npm | Node.js |
| HTML | `.html` `.htm` | vscode-html-language-server | npm（vscode-langservers-extracted） | Node.js |
| CSS / SCSS / Less | `.css` `.scss` `.less` | vscode-css-language-server | npm（同上） | Node.js |
| Vue | `.vue` | vue-language-server | npm（@vue/language-server@2 和 typescript） | Node.js |
| Go | `.go` | gopls | `go install` | Go |
| Java | `.java` | jdtls | 从 open-vsx.org 下载 Red Hat Java 支持包（约 140 MB） | 无，自带 Java 运行时 |
| C# | `.cs` | csharp-ls | `dotnet tool install` | .NET SDK |
| C / C++ | `.c` `.h` `.cpp` `.cc` `.cxx` `.hpp` `.hh` | clangd | 不支持，按提示用系统包管理器安装 | |

React 的 JSX/TSX 由 TypeScript 语言服务器负责。

Vue 使用 2.x 版本的语言服务器：3.x 只能通过 TypeScript 服务器插件工作，普通 LSP 客户端用不了。dcl 会自动传入它需要的 TypeScript 路径。

## 一键安装：`/lsp install <语言>`

```text
❯ /lsp install typescript
Install typescript-language-server for TypeScript/JavaScript?
  This installs typescript and typescript-language-server from npm.
  Location: ~/.deepseek-code/lsp
Continue? [y/N] y
Installing typescript-language-server for TypeScript/JavaScript... (Ctrl+C to cancel)
  …
Installed TypeScript/JavaScript (4.2s).
  Command: ~/.deepseek-code/lsp/node/node_modules/.bin/typescript-language-server
  Use /lsp list to check availability.
```

- **先说明再确认**：安装前会说明要下载什么、装到哪里，确认后才执行。命令行中用 `dcl lsp install java --yes` 跳过确认。
- **装在哪里**：所有内容都装在[数据目录](./data-directory.md)的 `lsp/` 下，**不需要管理员权限**，也不会改动系统里的 Node、Python 或 Java。
- **安装失败**：会显示具体原因和下一步，例如 `dotnet was not found on PATH; install the .NET SDK first`。下载的文件不是压缩包（比如服务器维护时返回了网页）时会拒绝安装，已有的安装保持可用。
- **重新安装**：再执行一次 `/lsp install` 即可覆盖。

语言名可以用别名：`js`、`ts`、`py`、`c#`、`cs`、`c++` 等。

## 查找顺序

模型对某个文件使用 LSP 时，dcl 按下面的顺序找服务端：

1. dcl 插件声明的语言服务器；
2. 在 Claude Code 里安装的 LSP 插件（见下一节）；
3. 内置列表：先找 `PATH`，再找 `lsp/` 下的托管安装。

都找不到时，`LSP` 工具不会只报"无法启动"，而是说明缺哪个服务端、怎么安装，模型会把这些信息转告你：

```text
The Java language server (jdtls) is not installed, so LSP features are unavailable for these files.
Install it with: download Eclipse JDT Language Server and put its jdtls launcher on PATH (requires a recent JDK).
Or ask the user to run `/lsp install java` in dcl (or `dcl lsp install java`) ...
```

## 使用 Claude Code 里安装的 LSP 插件

如果你在 Claude Code 中安装过官方 LSP 插件（例如 `rust-analyzer-lsp@claude-plugins-official`），dcl 会直接使用它们，不需要重新安装：

- 读取 `~/.claude/plugins/installed_plugins.json` 中的插件；
- 服务端配置依次从插件目录的 `.lsp.json`、插件清单的 `lspServers` 字段、市场清单中该插件的条目里读取；
- 在 `~/.claude/settings.json` 的 `enabledPlugins` 中被禁用的插件会跳过。

这些插件只是配置，服务端程序本身仍需安装好。`/lsp` 的 "From plugins" 一节会标出它们的命令能否找到。

插件方式也能接入内置列表之外的语言，例如官方市场中的 Kotlin、Lua、PHP、Ruby、Swift 插件。

列表、安装进度和完成信息会保留在本地屏幕历史中，便于滚动查看和鼠标复制。此显示缓存不会自动作为对话消息发送给模型。
