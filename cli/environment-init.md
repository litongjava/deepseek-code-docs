# 初始化开发环境

使用独立命令准备环境，无需配置模型：

```bash
dcl init-env node
dcl init-env python
dcl init-env codegraph
dcl init-env all
```

支持 Windows、macOS 和 Linux。使用 `--dry-run` 查看将执行的步骤而不安装；使用 `-C` 指定 CodeGraph 要索引的项目目录。

Node 初始化安装 nvm 和 Node LTS。Windows 使用 winget 安装 nvm-windows，激活 Node 时系统可能要求管理员权限；macOS 和 Linux 使用 nvm-sh，需要 bash、curl 和网络连接。已有 nvm 会复用。完成后打开新终端加载环境。

Python 初始化将 Miniconda 安装到用户目录，创建名为 `dcl-python` 的 Python 3 环境，并初始化 shell。已有环境会复用。Windows 使用 x86_64 安装程序；macOS 和 Linux 根据 x86_64 或 ARM64 选择安装包。之后运行：

```bash
conda activate dcl-python
python --version
```

CodeGraph 初始化需要 Node 和 npm；可以先运行 Node 初始化，或直接使用 `all`。它安装 npm 包、运行 `codegraph install --yes --init`，为当前项目建立索引，并注册 dcl 的 stdio MCP 服务。启动文件从安装包的 bin 字段解析，不依赖固定的 npm 目录。已有同名 MCP 配置会保留，可通过 `dcl mcp list` 检查。

安装过程直接显示进度，某一步失败立即退出并保留已完成的安装。重试前可按错误信息补齐网络、winget 或权限条件。`all` 按 Node、Python、CodeGraph 顺序运行。
