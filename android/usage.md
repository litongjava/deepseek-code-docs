# 首次使用与开发环境

## 配置模型

打开应用后，在用户菜单进入“设置” → Models，添加供应商地址、密钥和模型，保存后回到聊天页选择模型。发送“回复 OK”检查连接，再让模型执行简单命令。供应商配置可参考[运行模式与模型供应商](../desktop/configuration/models.md)。

本机模式指引擎和工具运行在手机上；模型服务由你配置的供应商提供。联网要求取决于模型服务和软件仓库的位置。

## 打开 Ubuntu 终端

首次启动下载的 Ubuntu 基础环境就绪后，在右侧面板选择 Terminal 并新建终端：

```bash
head -2 /etc/os-release
pwd
```

第一条应显示 Ubuntu 的系统信息。若显示 Android 系统 Shell 的结果，等待环境准备完毕后新建终端再试。终端与模型 Bash 工具使用相同的 Ubuntu 环境和工作区绑定，手动安装的软件可以直接交给模型使用。

手机终端提供 Esc、Tab、Ctrl+C 和方向键，支持补全、历史记录与中断。关闭终端前会确认是否结束其中的进程。

## 安装开发工具

以下命令在应用内 Ubuntu 终端执行：

```bash
apt-get update
apt-get install -y ca-certificates curl git nodejs npm python3 python3-pip python3-venv
node --version
npm --version
python3 --version
git --version
```

可继续安装常用的文件处理与编译工具：

```bash
apt-get install -y --no-install-recommends \
  wget openssh-client openssl rsync tar gzip bzip2 xz-utils zip unzip \
  procps psmisc lsof tree tmux nano vim-tiny less file jq ripgrep \
  findutils diffutils sed gawk build-essential pkg-config
```

让模型创建项目、读取文件或运行测试时，按应用的工具审批提示确认。PRoot 内的 root 身份便于安装软件，手机的实际访问权限仍由 Android 决定。

软件保存在应用数据中，正常更新 APK 后保留。切换 APT 镜像时保留发行套件、组件和签名校验配置；基础环境缺少 CA 证书时，可先用发行版已签名的 HTTP 软件源安装 `ca-certificates`，再切回 HTTPS。

## 试运行脚本

```bash
mkdir -p /root/demo
cd /root/demo
python3 -c 'print("Hello from Android")'
node -e 'console.log("Hello from Android")'
```

在项目或终端当前工作区创建的文件可继续由模型处理。应用数据位于私有目录，访问手机共享存储仍取决于系统授权。

## 后台任务与数据

任务进行时会显示“正在本机运行”的通知。切到其他应用后，前台服务帮助引擎继续执行；厂商的电池与后台策略仍可能影响运行，可在系统设置中允许应用后台活动。从最近任务列表划掉应用会停止服务。

本机历史、设置、项目文件和 Ubuntu 软件保存在手机中。清除应用数据或卸载应用会一并移除；重要文件应先复制到你管理的备份位置。

## 连接服务器

需要电脑上的项目和工具时，先在电脑启动服务器：

```bash
dcd-server --host 0.0.0.0 --port 8443 --tls-cert cert.pem --tls-key key.pem
```

在另一个终端查询同一数据目录的令牌：

```bash
dcd-server --print-token
```

手机用户菜单选择“连接服务器”，填写可访问的 HTTPS 地址与令牌。正式包使用 HTTPS；证书须被手机信任。完整服务器构建、反向代理和网络说明见[在浏览器和手机上使用](../desktop/guide/web-and-mobile.md)。

远程模式下，命令和文件操作发生在服务器上，历史保存在服务器。本机与远程模式各自保留历史；登录页或用户菜单选择“在本机运行”即可切回手机。

USB 调试时，可把电脑回环端口转发给手机：

```bash
adb reverse tcp:39085 tcp:30085
```

电脑以默认参数启动 `dcd-server`，手机调试包连接 `http://127.0.0.1:39085` 并填写该服务器令牌。这是调试流程，日常远程使用采用 HTTPS。
