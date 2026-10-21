import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE || '/';
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('DOCS_BASE 必须以 / 开头和结尾，例如 /claude-rust/');
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Claude Rust 文档',
  description: 'Claude Rust Desktop 产品手册：安装、模型配置、聊天、项目、工具、扩展、开发与维护。',
  base,
  vite: { publicDir: 'assets' },
  srcExclude: ['README.md'],
  lastUpdated: false,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '产品手册', link: '/guide/overview' },
      { text: '配置', link: '/configuration/models' },
      { text: '使用指南', link: '/usage/chat' },
      { text: '开发', link: '/development/architecture' }
    ],
    sidebar: [
      { text: '产品概览', items: [
        { text: '项目介绍', link: '/guide/overview' },
        { text: '功能地图与阅读路线', link: '/guide/features' },
        { text: '首次使用', link: '/guide/usage' }
      ] },
      { text: '安装', collapsed: false, items: [
        { text: '安装客户端', link: '/guide/installation' },
        { text: '从源码运行', link: '/guide/quick-start' }
      ] },
      { text: '配置', collapsed: false, items: [
        { text: '运行模式与模型供应商', link: '/configuration/models' },
        { text: '通用设置与工作目录', link: '/configuration/preferences' },
        { text: '工具权限', link: '/configuration/permissions' },
        { text: 'MCP 服务', link: '/configuration/mcp' }
      ] },
      { text: '使用指南', collapsed: false, items: [
        { text: '聊天与会话', link: '/usage/chat' },
        { text: '项目与文件工作流', link: '/usage/projects' },
        { text: '自定义：技能与扩展', link: '/usage/skills' },
        { text: '知识库与记忆', link: '/usage/knowledge' }
      ] },
      { text: '进阶功能', collapsed: true, items: [
        { text: '定时任务', link: '/advanced/tasks' },
        { text: 'IM 集成', link: '/advanced/im' },
        { text: '研究、创作与辅助面板', link: '/advanced/workbench' }
      ] },
      { text: '开发指南', collapsed: true, items: [
        { text: '通信架构', link: '/development/architecture' },
        { text: '浏览器调试', link: '/development/browser' },
        { text: '源码与接口导航', link: '/development/source' },
        { text: 'Code 提示词与隐私适配', link: '/development/code-prompt' },
        { text: '测试与故障排查', link: '/development/troubleshooting' }
      ] },
      { text: '维护与参考', collapsed: true, items: [
        { text: '数据备份、升级与迁移', link: '/maintenance/data' },
        { text: '常见问题', link: '/maintenance/faq' },
        { text: '文档站构建与部署', link: '/deployment' },
        { text: '应用界面', link: '/verification' }
      ] }
    ],
    search: { provider: 'local', options: { locales: { root: { translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
      modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清除搜索',
        footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } }
    } } } } },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录', returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '外观',
    footer: { message: '独立文档站 · React 19 / Tauri 2 / Rust', copyright: 'Claude Rust Desktop 使用指南。' }
  }
});
