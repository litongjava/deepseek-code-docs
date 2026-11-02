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

## macOS 与 Linux 的独立测试环境

可以通过单独的 HOME 隔离 nvm、Miniconda 和 dcl 配置，适合验证首次安装流程。下面的命令在子 shell 中执行，退出后恢复原来的环境：

```bash
bash --noprofile --norc
export HOME="$PWD/.dcl-env-test"
mkdir -p "$HOME"
export NVM_DIR="$HOME/.nvm"
export DEEPSEEK_CODE_DATA_DIR="$HOME/dcl-data"
export PROFILE=/dev/null
dcl init-env all
. "$NVM_DIR/nvm.sh"
. "$HOME/miniconda3/etc/profile.d/conda.sh"
conda activate dcl-python
node --version
python --version
exit
```

请在专用测试项目中执行，CodeGraph 会初始化当前项目。运行前确保 `dcl` 可以从 PATH 中找到。`PROFILE=/dev/null` 让 nvm 不自动修改 shell 配置；Miniconda 的 shell 初始化写入独立 HOME。此方法隔离用户级配置和安装目录，仍使用宿主系统的网络与工具。
