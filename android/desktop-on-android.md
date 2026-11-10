# 桌面版在 Android 上运行的原理与命令

DeepSeek Code 通过共享界面和引擎，把桌面版的开发工作流带到 Android。构建系统将 React 界面打包进 APK，将 Rust 引擎编译为 Android 原生库；Android WebView 显示界面，应用内 Bridge 提供与桌面版一致的接口。手机本机即可完成会话管理、工具审批、文件操作和命令执行。

## 从桌面工作台到手机应用

请求按下面的顺序流转：

```text
Android WebView 中的 React 界面
  → 手机回环地址上的 Bridge
    → 共享 Rust 引擎、会话、权限与持久化
      → 模型服务 / 文件工具 / Bash 工具
                                → PRoot → Ubuntu 用户空间
```

Tauri 提供应用容器和平台接口，共享前端便于保留熟悉的聊天与项目操作。移动入口在应用私有目录初始化数据库，并在应用进程内启动 Bridge，前端取得实际端口和本进程的访问密钥后连接。Bridge 从 30085 端口尝试监听，端口占用时可以选择后续端口，因此调用方通过应用接口发现端点。

引擎在 Android 原生库中运行；Ubuntu 用于补齐 Bash、包管理器和开发工具。手机与桌面各自使用本地数据目录，共享代码和数据格式不会自动同步两个设备的历史。

## PRoot 如何提供 Linux 工具

Android 与常见 Linux 发行版共享内核基础，但应用环境和用户空间工具不同。应用随 APK 打包 PRoot 及其运行组件，首次启动下载并校验与 CPU 架构匹配的 Ubuntu 根文件系统，放入应用私有数据中。

PRoot 在用户空间处理进程的路径和相关系统调用，使 Bash、APT、Git、Python、Node.js 等程序使用 Ubuntu 的文件系统与软件库。它使用手机现有内核，无需 Root 或启动完整虚拟机；程序仍受 Android 应用权限约束。

环境准备完成前，命令回退到系统 Shell。下载通过 SHA-256 校验、解包和基础配置完成后写入就绪标记，引擎再使用 Ubuntu。

## 应用实际怎样启动命令

引擎设置 `DEEPSEEK_CODE_PROOT`、`DEEPSEEK_CODE_PROOT_LOADER` 和 `DEEPSEEK_CODE_ROOTFS`，定位 APK 中的 PRoot、loader 和已安装的根文件系统。原生可执行组件以 `lib*.so` 形式打包并提取到应用的原生库目录，配合 Android 的执行规则。

Bash 命令的结构如下；这是原理示意，路径由应用自动提供：

```text
libproot.so -0 --link2symlink --kill-on-exit \
  -r <Ubuntu 根目录> \
  -b <应用数据目录> -b <工作区目录> \
  /bin/bash -c '<命令>'
```

- `-0` 在 Ubuntu 用户空间模拟 root 身份，便于 APT 安装软件。
- `--link2symlink` 适配硬链接行为，`--kill-on-exit` 配合进程退出清理。
- `-r` 选择 Ubuntu 根文件系统，`-b` 将工作区等宿主目录按原路径绑定进去。

启动时还会配置 `PROOT_LOADER`、`LD_LIBRARY_PATH`、`PROOT_TMP_DIR`、Ubuntu 的 `PATH`、`HOME` 和 UTF-8 语言环境。应用文件工具与 Bash 因此可处理同一工作区；交互终端复用相同环境，并通过 PTY 启动登录 Bash。

## 在电脑构建并安装 Android 应用

在 Linux x86_64 电脑准备 Node.js、Rust、Android SDK、NDK、JDK 和所需环境变量，然后从源码仓库根目录执行：

```bash
npm ci
rustup target add aarch64-linux-android
npm run android:proot
npx tauri android build --apk --debug --target aarch64
```

把输出的调试 APK 复制为 `app-debug.apk`，在已打开 USB 调试的手机上安装启动：

```bash
adb devices -l
adb install -r app-debug.apk
adb shell am start -n com.deepseek.code/.MainActivity
```

Windows/WSL、模拟器与发布包签名的命令见[构建与安装](./build.md)。

## 在手机应用内运行开发命令

Ubuntu 就绪后，在应用的 Terminal 中执行：

```bash
head -2 /etc/os-release
apt-get update
apt-get install -y ca-certificates curl git nodejs npm python3
python3 -c 'print("Android local engine")'
node -e 'console.log("Ubuntu tools ready")'
```

随后可以让模型调用 Bash 执行项目命令，沿用相同的软件和工作区。首次安装、下载和模型服务需要网络；本机引擎与工具的运行位置始终在手机。

## 使用电脑的项目和工具

应用也支持将界面连接到电脑上的引擎。电脑执行：

```bash
dcd-server --host 0.0.0.0 --port 8443 --tls-cert cert.pem --tls-key key.pem
```

另开终端查询令牌：

```bash
dcd-server --print-token
```

在手机菜单选择“连接服务器”并填写地址与令牌。此时引擎、命令和文件读写运行在电脑上；选择“在本机运行”即可恢复手机本地工作流。具体连接步骤见[首次使用](./usage.md#连接服务器)。
