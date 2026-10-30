# 测试与故障排查

## 建议的验证顺序

1. 文档站或应用页面能打开，静态资源正常。
2. Bridge 系统状态接口能访问。
3. 带 Key 的只读接口能返回成功状态。
4. 配置模型后验证一次简单对话与 SSE。
5. 在桌面环境验证涉及 `invoke()` 的操作。

每一步独立记录结果，避免用“首页正常”替代“全部业务正常”。

## 页面打开但接口连接失败

检查是否只运行了 Vite。`npm.cmd run dev` 不会启动 Rust。查看 `30085` 是否监听，以及 Rust 是否因为编译、数据库初始化或运行时错误退出。

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in @(5200, 5201, 30085, 30086, 30087, 30088, 30089, 30090) } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Linux：

```bash
ss -ltnp | grep -E ':(5200|5201|3008[5-9]|30090) '
```

## 401 或浏览器报告 CORS

核对浏览器来源是否为允许的 `http://127.0.0.1:5200`，并检查 Bridge Key 是否来自当前后端实例。桌面端的存储不会自动同步到 Chrome。

Bridge 的鉴权中间件可能在 CORS 层处理前直接返回 401，因此未授权响应也可能表现成跨域错误。先核对凭据，再判断是否真的需要修改来源列表。

不要用网关登录令牌或供应商 Key 代替 Bridge Key。

## invoke 或安全存储不可用

确认是否在普通浏览器。`__TAURI_INTERNALS__` 缺失是普通浏览器的预期状态。切回桌面窗口测试，或对该功能实现 HTTP 适配。

## 5200 或 5201 被占用

前端采用固定端口，检查是否重复启动 Vite。确认占用进程属于自己当前开发任务后，在原启动终端停止，再重新启动。

## 聊天能请求但没有内容

查看 `/api/chat` 的状态和响应类型，核对供应商、模型名和实际错误内容。若通过反向代理访问 SSE，确认代理没有缓冲流式响应，并设置足够的读取超时。

## 30090 连接失败

请求进入了可选网关。按[启动说明](../guide/quick-start.md#可选-启动-node-网关)运行 `api-proxy`，或检查当前功能是否要求网关模式。

## 开发检查命令

在应用目录运行与变更相关的检查：

```powershell
npx.cmd tsc --noEmit
npm.cmd run test:run
npm.cmd run build
cargo test --locked -p deepseek-code-core --lib --tests
cargo test --locked -p deepseek-code-desktop
cargo check --locked -p deepseek-code-desktop --all-targets
```

前端的 `build` 脚本执行 Vite 构建，不应把构建成功等同于独立 TypeScript 类型检查通过，类型检查用 `npx.cmd tsc --noEmit`。业务逻辑在共享引擎 `deepseek-code-core` 中，修改引擎时两组 Rust 测试都要跑。Rust 检查需要完整本机构建环境。

构建 release 版本和安装包见[从源码运行](../guide/quick-start.md#构建-release-版本)。Cargo 输出在仓库根目录的 `target/` 下（不是 `src-tauri/target`）：可执行文件 `target/release/dcd`（Windows 为 `dcd.exe`），安装包在 `target/release/bundle/`。
