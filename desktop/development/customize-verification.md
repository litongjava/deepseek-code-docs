# 自定义入口验证

## 验证范围

2026-10-14，在本地前端开发页面使用 deepseek-browser-use CLI 操作有头 Chrome。测试过程显示浏览器窗口，截图位于文档项目的 `assets` 目录。

验证目标为扩展菜单、自定义的四项导航、插件分类搜索，以及 Settings 内嵌页面。插件当前仅提供分类浏览。MCP 页面沿用桌面 IPC，浏览器验证只检查入口和页面，不代表原生服务启动、停止或工具调用已验证。

## 回归检查

- Settings、自定义、侧栏折叠与展开、项目侧栏相关测试：35 项通过。
- TypeScript：`npx tsc --noEmit` 通过。
- 应用生产构建：`npm run build` 通过。
- 可见 Chrome：独立自定义页面 22 步、Settings 内嵌页面 21 步全部通过，无失败动作或失败断言。Settings 页面在 1664×937 与 1280×800 视口检查，无页面横向溢出。
- 技能创建入口追加验证 11 步通过：Settings 内选择“使用 Claude 创建”会进入新的聊天输入界面并预填 skill-creator 提示，未发送消息。（这个入口现已改名为“使用 DeepSeek Code 创建”。）

逐项断言结果保存在[浏览器验证记录](/customize-browser-verification.json)。

## 扩展菜单与自定义

扩展菜单移除了“目录”和独立 MCP，仅通过“自定义”进入技能、MCP、连接器与插件。

![扩展菜单](/customize-extensions.png)

![自定义概览](/customize-overview.png)

## 插件与设置入口

插件按名称和描述搜索分类；找不到结果时显示明确的空状态。设置内的“自定义”使用同一套页面，可切换四项导航；返回先进入自定义概览，再回到通用设置。

![插件分类](/customize-plugins.png)

![Settings 内的自定义](/customize-settings-plugins.png)

![较窄窗口中的设置自定义](/customize-settings-narrow.png)
