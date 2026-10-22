# 图片

交互模式下，可以把图片和提示词一起发给模型，例如截图、设计稿、报错界面。

## 发送图片的三种方式

1. **拖入终端**：把图片文件拖进终端窗口，终端会插入它的路径。
2. **写路径**：直接写图片路径，或写 `@图片.png`。路径可以带引号，也可以是绝对路径。
3. **粘贴剪贴板图片**：截图后在输入框按 `Ctrl+V`，dcl 会把图片保存到[数据目录](./data-directory.md)的 `pasted-images/` 下，并插入 `@路径`。

```text
> 这个页面哪里对不齐？ @/home/you/.deepseek-code/pasted-images/3f2c….png
```

## 规则

- **格式与大小**：支持 PNG、JPEG、GIF、WebP；每张不超过 5 MB；一条提示词最多 5 张。
- **同时附带文件**：同一条提示词里 `@` 引用的其他文本文件照常附带，见[`@` 引用文件](./file-mentions.md)。
- **模型要求**：当前模型必须支持图片输入，否则会提示 `Selected model does not accept Image input`。DeepSeek 的 `deepseek-flash` 支持图片。
- **仅限交互模式**：`dcl -p` 不处理图片路径。

## 剪贴板依赖

粘贴图片依赖系统工具：

| 系统 | 需要的工具 |
|---|---|
| Linux（Wayland） | `wl-paste`（wl-clipboard） |
| Linux（X11） | `xclip` |
| macOS | `pngpaste`（`brew install pngpaste`），没有时用系统自带的 `osascript` |
| Windows | PowerShell，系统自带 |

剪贴板里没有图片时，`Ctrl+V` 什么也不做；粘贴文字仍按终端的正常方式进行。
