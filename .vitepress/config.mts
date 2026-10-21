import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE || '/';
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('DOCS_BASE 必须以 / 开头和结尾，例如 /claude-rust/');
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'DeepSeek Code 文档',
  description: 'DeepSeek Code 文档：Desktop 桌面客户端（dcd）与 CLI 命令行（dcl）的安装、配置、使用、开发与维护。',
  base,
  vite: { publicDir: 'assets' },
  srcExclude: ['README.md'],
  lastUpdated: false,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Desktop', link: '/desktop/guide/overview', activeMatch: '^/desktop/' },
      { text: 'CLI', link: '/cli/', activeMatch: '^/cli/' },
      { text: '文档站部署', link: '/deployment' }
    ],
    sidebar: {
      '/desktop/': [
      { text: '产品概览', items: [
        { text: '项目介绍', link: '/desktop/guide/overview' },
        { text: '功能地图与阅读路线', link: '/desktop/guide/features' },
        { text: '首次使用', link: '/desktop/guide/usage' }
      ] },
      { text: '安装', collapsed: false, items: [
        { text: '安装客户端', link: '/desktop/guide/installation' },
        { text: '从源码运行', link: '/desktop/guide/quick-start' }
      ] },
      { text: '配置', collapsed: false, items: [
        { text: '运行模式与模型供应商', link: '/desktop/configuration/models' },
        { text: '通用设置与工作目录', link: '/desktop/configuration/preferences' },
        { text: '工具权限', link: '/desktop/configuration/permissions' },
        { text: 'MCP 服务', link: '/desktop/configuration/mcp' }
      ] },
      { text: '使用指南', collapsed: false, items: [
        { text: '聊天与会话', link: '/desktop/usage/chat' },
        { text: '项目与文件工作流', link: '/desktop/usage/projects' },
        { text: '自定义：技能与扩展', link: '/desktop/usage/skills' },
        { text: '知识库与记忆', link: '/desktop/usage/knowledge' }
      ] },
      { text: '进阶功能', collapsed: true, items: [
        { text: '定时任务', link: '/desktop/advanced/tasks' },
        { text: 'IM 集成', link: '/desktop/advanced/im' },
        { text: '研究、创作与辅助面板', link: '/desktop/advanced/workbench' }
      ] },
      { text: '开发指南', collapsed: true, items: [
        { text: '通信架构', link: '/desktop/development/architecture' },
        { text: '浏览器调试', link: '/desktop/development/browser' },
        { text: '源码与接口导航', link: '/desktop/development/source' },
        { text: 'Code 提示词与隐私适配', link: '/desktop/development/code-prompt' },
        { text: '测试与故障排查', link: '/desktop/development/troubleshooting' }
      ] },
      { text: '维护与参考', collapsed: true, items: [
        { text: '数据备份、升级与迁移', link: '/desktop/maintenance/data' },
        { text: '常见问题', link: '/desktop/maintenance/faq' },
        { text: '文档站构建与部署', link: '/deployment' },
        { text: '应用界面', link: '/desktop/verification' }
      ] }
      ],
      '/cli/': [
        { text: 'CLI 入门', items: [
          { text: 'dcl 概览', link: '/cli/' },
          { text: '安装与构建', link: '/cli/install' },
          { text: '接入 DeepSeek 模型', link: '/cli/deepseek' }
        ] },
        { text: '使用', items: [
          { text: '非交互模式与自动化', link: '/cli/non-interactive' }
        ] },
        { text: '维护与参考', items: [
          { text: '故障排查', link: '/cli/troubleshooting' }
        ] }
      ]
    },
    search: { provider: 'local', options: { locales: { root: { translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
      modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清除搜索',
        footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } }
    } } } } },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录', returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '外观',
    footer: { message: '独立文档站 · Desktop（Tauri 2）与 CLI（Rust）', copyright: 'DeepSeek Code 使用指南。' }
  }
});
