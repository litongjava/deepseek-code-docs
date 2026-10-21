# 构建与部署

本站是独立 VitePress 工程。复制或单独管理整个 `claude-rust-desktop-docs` 目录，即可安装、开发和部署；没有对应用源码目录的运行依赖。

## 本地开发与预览

```powershell
npm.cmd ci
npm.cmd run dev
```

开发地址：`http://127.0.0.1:5174`。

```powershell
npm.cmd run build
npm.cmd run preview
```

生产构建预览地址：`http://127.0.0.1:4174`。构建输出位于 `.vitepress/dist`。预览命令用于验收构建产物，正式部署使用静态托管平台或 Web 服务器。

## 部署到站点根路径

使用 Node.js 22 环境执行 `npm ci` 和 `npm run build`，将 `.vitepress/dist` 的全部内容上传到静态托管服务。

静态托管配置：构建命令 `npm run build`；发布目录 `.vitepress/dist`。不需要后端启动命令，不需要模型 Key。当前使用 `.html` 页面路径，保留构建产生的目录与文件结构即可。

GitHub Pages 等托管服务应通过其构建工作流上传该目录；如果直接用分支发布静态文件，发布根目录可添加 `.nojekyll`。

## 部署到子路径

例如 `https://example.com/claude-rust/`，构建前设置：

```powershell
$env:DOCS_BASE = '/claude-rust/'
npm.cmd run build
npm.cmd run preview
```

此时本地预览地址为 `http://127.0.0.1:4174/claude-rust/`。服务器也应把产物放到对应 URL 前缀下。路径必须以 `/` 开头和结尾。

恢复根路径构建：

```powershell
$env:DOCS_BASE = '/'
npm.cmd run build
```

Linux CI 可使用 `DOCS_BASE=/claude-rust/ npm run build`。

## 图片与截图

原始图片资源统一放在工程根目录 `assets/`，Markdown 使用相对路径引用：

```md
![浏览器调试指南页面](./assets/docs-browser.png)
```

VitePress 会处理 Markdown 中的图片引用，将资源包含在构建产物中。不要只上传 Markdown 或遗漏 `.vitepress/dist/assets`。`assets/logo.svg` 是本站自绘标识，不是官方品牌标志。

## 发布前验收

- 运行构建，确认没有无效内部链接错误。
- 用生产预览检查首页、侧栏、全文搜索和深层页面刷新。
- 检查截图清晰、无真实凭据，图片和代码块在窄窗口可读。
- 若部署到子路径，按实际 `DOCS_BASE` 再构建和验收。

部署文档只会发布说明和静态图片，不会让访问者直接操作你的 Rust 后端。若要交付客户端，请另行提供应用安装包；若要交付完整 Web 应用，需要完成浏览器能力适配和服务部署。
