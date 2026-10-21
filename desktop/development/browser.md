# 浏览器调试

浏览器能调试 React 页面和已有 HTTP / SSE 功能；完整原生能力需要 Tauri 桌面窗口。先选对环境，再判断失败原因。

## 路线一：桌面开发者工具

在应用目录执行：

```powershell
npm.cmd run tauri dev
```

在桌面窗口尝试 `F12` 或 `Ctrl+Shift+I` 打开开发者工具。该项目启用了 Tauri `devtools` 特性；快捷键是否响应也取决于 WebView 和窗口环境。

- Elements：查看 DOM、样式和布局。
- Console / Sources：观察异常、打断点。
- Network：查看 HTTP、SSE 及开发热更新连接。
- Rust 启动终端：查看命令处理、工具调用和后端错误。

`invoke()` 不一定在 Network 中显示为普通 HTTP 请求。IPC 调试应同时看前端异常和 Rust 日志。

## 路线二：Chrome / Edge

### 1. 保持 Rust 后端运行

推荐先运行完整 `tauri dev`，再在浏览器打开：

```text
http://127.0.0.1:5200
```

如果只运行 `npm.cmd run dev`，只能得到前端服务，不会自动启动 Rust。

### 2. 检查 Bridge

直接访问：

```text
http://127.0.0.1:30085/api/system-status
```

预期得到 JSON。此接口无需鉴权，成功只能说明服务可达，不能证明聊天、供应商或原生功能已经可用。

端口被占用时查看 Rust 日志中的实际端口。当前请求层的自动初始化主要在 Tauri 环境触发；浏览器不能假定会自动把所有请求切换到发现的端口。最直接的本地调试方式是确保 `30085` 空闲后重启应用。

### 3. 开发浏览器的本地代理

`npm.cmd run tauri dev` 启动后，访问 `http://127.0.0.1:5200`。开发模式的供应商与聊天请求使用同源 `/api`，Vite 将请求转发到 `127.0.0.1:30085`，在服务器侧读取数据目录（默认 `~/.deepseek-code`，规则同[数据位置](../maintenance/data.md#数据位置)）下的 `dev-bridge-key` 并添加 Bridge 鉴权。

该文件仅由 Rust 调试构建生成，位于仓库外。代理限制本机 Host 和来源；浏览器不需要手动复制 Key。Rust 重新启动后，代理会读取新 Key。后端编译或未启动期间出现 500/连接失败时，等待启动完成再刷新。

### 4. 验证受保护接口

在应用页面的开发者工具中执行：

```js
const response = await fetch('/api/providers');
console.log('HTTP 状态：', response.status);
```

预期为 200。供应商配置由 Rust 保存到本地文件。生产构建没有此开发代理，Tauri 通过原生初始化获取 Bridge Key；其他浏览器部署仍需要独立鉴权方案。

### 5. 验证聊天流

选择已配置的模型并发送简单消息，在 Network 中找到 `/api/chat`：

1. 确认请求目标是预期的 Bridge 端口。
2. 确认响应为 `text/event-stream`，内容逐步到达。
3. 查看页面是否逐步渲染内容。
4. 若请求到达后端但模型报错，继续核对供应商地址、凭据、模型和 Rust 日志。

供应商凭据与 Bridge Key 是两类凭据。后者只负责本地接口鉴权，不能替代模型供应商的 Key。

## 浏览器里仍然存在的限制

部分知识库、MCP 管理、差异应用、Remotion 和权限操作直接调用 `invoke()`，需要逐项适配。原生窗口操作、文件对话框等也不能原样移入普通浏览器。

供应商设置已经统一通过 Rust 保存本地文件；其他涉及 `secureStorage` 的功能仍需逐项检查。某些流程还依赖 `30090` 网关。

要确认一个按钮能否在浏览器运行，应追踪它调用 `fetch` 还是 `invoke`，而不是只看页面有没有该按钮。

## 结束本地调试

可在浏览器 Console 清除这次手动配置的 Key：

```js
localStorage.removeItem('bridge_api_key');
```

主界面示例见[应用界面](../verification.md)。
