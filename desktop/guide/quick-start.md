# 从源码运行

本章面向开发者和自行构建的使用者。已有安装包时先看[安装客户端](./installation.md)，日常配置见[模型供应商](../configuration/models.md)。

以下应用命令在源码仓库 `deepseek-code` 目录运行；文档站命令在 `deepseek-code-docs` 目录运行。

## 准备开发环境

Windows 开发建议准备：

- Node.js 22 LTS 与 npm。本次文档环境使用 Node.js 22.23.2。
- 当前稳定版 Rust MSVC 工具链，通过 [rustup](https://rustup.rs/) 安装。具体兼容性以当前锁文件的编译结果为准。
- Visual Studio Build Tools：C++ 桌面开发工具与 Windows SDK。
- Microsoft Edge WebView2 Runtime，供 Tauri 窗口使用。
- Git for Windows，包含 Git Bash；部分工具执行依赖它。

先检查工具能否使用：

```powershell
node --version
npm.cmd --version
rustc --version
cargo --version
git --version
```

本文 Windows 命令使用 `npm.cmd`，避免 PowerShell 的脚本执行策略拦截 `npm.ps1`，无需修改系统执行策略。

## Linux 构建

Linux（以 Debian 12 为例）需要 Node.js 22+、Rust 稳定版，以及 Tauri 2 的系统开发库：

```bash
sudo apt install pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libasound2-dev libxdo-dev
```

构建并得到桌面可执行文件 `dcd`：

```bash
npm ci
npm run build                                  # 前端产物 dist/
cargo build --locked -p deepseek-code-desktop  # target/debug/dcd
```

没有 root 权限时，可以用 `apt-get download` 下载上述 `-dev` 包及其依赖的 `-dev` 包，解压到用户目录并设置 `PKG_CONFIG_PATH`、`PKG_CONFIG_SYSROOT_DIR` 和 `RUSTFLAGS="-L ..."`，方法与 [CLI 的无 root 构建](../../cli/install.md#没有-root-权限时的-linux-构建)相同；`libsoup-3.0` 还需要 `libsysprof-4-dev` 提供的 `sysprof-capture-4`。前提是对应的运行库已经安装。

## 启动完整桌面开发环境

```powershell
cd D:\code\deepseek-code
npm.cmd ci
npm.cmd run tauri dev
```

首次编译 Rust 可能较慢。Tauri 会根据 `src-tauri/tauri.conf.json` 自动启动 Vite，随后启动桌面窗口和 Rust Bridge。不要同时在另一终端重复运行前端开发服务，否则会占用 `5200`。

预期看到：

- Vite 页面地址 `http://127.0.0.1:5200`。
- Tauri 桌面窗口。
- Rust 终端出现 Bridge 启动记录，默认端口 `30085`。

Bridge 默认端口不可用时会尝试 `30086` 至 `30089`，以启动日志为准。

## 只启动前端

```powershell
npm.cmd run dev
```

浏览器访问 `http://127.0.0.1:5200`。适合调样式和布局，但此命令不会启动 Rust。需要业务接口时，请保持桌面后端运行，并按[浏览器调试指南](../development/browser.md)处理鉴权。

## 可选：启动 Node 网关

仅当要使用对应网关功能时，在另一终端运行：

```powershell
cd D:\code\deepseek-code\api-proxy
npm.cmd install
npm.cmd run dev
```

服务端口为 `30090`。代码读取 `JWT_SECRET`、`KIE_API_URL`、`KIE_API_KEY` 以及 GitHub OAuth 相关环境变量；按实际使用的服务配置。`JWT_SECRET` 未配置时会临时生成，重启可能使原有令牌失效。`better-sqlite3` 安装失败时检查 Node 版本及本机构建工具。

这只是本地开发入口，不代表网关已完成生产部署配置。

## 启动文档站

```powershell
cd D:\code\deepseek-code-docs
npm.cmd ci
npm.cmd run dev
```

访问 `http://127.0.0.1:5174`，修改 Markdown 后页面自动更新。这个步骤不启动应用或模型服务。

## 停止服务

在各自的启动终端按 `Ctrl+C`。停止后再启动，能避免遗留进程占用端口；不要直接结束不明来源的进程。
