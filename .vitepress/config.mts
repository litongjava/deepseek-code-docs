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
        { text: '入门', items: [
          { text: 'dcl 概览', link: '/cli/' },
          { text: '安装与构建', link: '/cli/install' }
        ] },
        { text: '配置', items: [
          { text: '首次启动与内置提供商', link: '/cli/first-run' },
          { text: '接入 DeepSeek', link: '/cli/deepseek' },
          { text: '模型与提供商', link: '/cli/providers' },
          { text: '数据目录', link: '/cli/data-directory' },
          { text: '设置项参考', link: '/cli/settings' }
        ] },
        { text: '交互模式', items: [
          { text: '交互界面与快捷键', link: '/cli/interface' },
          { text: '工具调用与改动详情', link: '/cli/tool-calls' },
          { text: '! 命令模式', link: '/cli/shell-mode' },
          { text: '@ 引用文件', link: '/cli/file-mentions' },
          { text: '图片', link: '/cli/images' },
          { text: '# 写入项目说明', link: '/cli/memory-notes' },
          { text: 'vim 模式', link: '/cli/vim-mode' },
          { text: '回退', link: '/cli/rewind' },
          { text: '权限模式与工具审批', link: '/cli/permissions' },
          { text: '计划模式', link: '/cli/plan-mode' },
          { text: '自动权限模式', link: '/cli/auto-mode' },
          { text: '建议补全', link: '/cli/suggestions' },
          { text: '运行提示', link: '/cli/tips' },
          { text: '状态查看', link: '/cli/status' },
          { text: '输出上限与自动续写', link: '/cli/output-limit' },
          { text: '上下文用量与费用', link: '/cli/context-and-cost' }
        ] },
        { text: '代码智能与外部代理', items: [
          { text: '语言服务器（LSP）', link: '/cli/lsp' },
          { text: '调用 Claude Code 与 Codex', link: '/cli/external-agents' },
          { text: '代码审查与安全审查', link: '/cli/code-review' }
        ] },
        { text: '自动化', items: [
          { text: '非交互模式', link: '/cli/non-interactive' },
          { text: '结构化输出', link: '/cli/structured-output' },
          { text: 'SDK 与 stream-json 协议', link: '/cli/sdk' }
        ] },
        { text: '协作', items: [
          { text: '团队同步', link: '/cli/team-sync' },
          { text: '远程控制', link: '/cli/remote-control' },
          { text: '会话消息', link: '/cli/session-messages' },
          { text: '代理团队', link: '/cli/agent-teams' }
        ] },
        { text: '实战与参考', items: [
          { text: '用 dcl 修复开源项目 Issue', link: '/cli/case-qwerty-learner' },
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
