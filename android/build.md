# 构建与安装

本页命令在 DeepSeek Code 源码仓库根目录执行。构建只生成产物，不会替换电脑上已安装的 dcl 或 dcd。

## 准备电脑

准备 Node.js 22 或更新版本、Rust、JDK 17 或 21、Android SDK Platform 36、build-tools 和 NDK r27。设置 `JAVA_HOME`、`ANDROID_HOME`、`NDK_HOME`，并把 SDK 的 `platform-tools` 加入 PATH，以便使用 `adb`。

PRoot 准备脚本使用 Linux 的 `ar`，并下载 Linux x86_64 的 `patchelf`。下面的完整流程适用于 Linux x86_64；Windows 使用 WSL 准备组件。macOS 不直接运行这个 Linux 脚本，可先在 Linux x86_64 环境准备组件，再使用配置好的 Android 构建工具链。

```bash
npm ci
rustup target add aarch64-linux-android
npm run android:proot
npx tauri android build --apk --debug --target aarch64
```

这里构建的是 arm64 真机调试包。x86_64 模拟器使用：

```bash
rustup target add x86_64-linux-android
npx tauri android build --apk --debug --target x86_64
```

Android 工程已经包含在仓库中。PRoot 准备脚本按固定 SHA-256 校验组件，生成 arm64-v8a 和 x86_64 两套原生文件，并收集许可证文本。

## Windows 与 WSL

在同一份工作树中分两步执行。先由 WSL 准备组件：

```powershell
wsl bash scripts/fetch-android-proot.sh
```

再在已配置 Windows SDK、NDK、JDK 和 Node.js 的 PowerShell 中执行：

```powershell
npm ci
rustup target add aarch64-linux-android
npx tauri android build --apk --debug --target aarch64
```

有多个 WSL 发行版时，用 `wsl -d <发行版> bash scripts/fetch-android-proot.sh` 指定。Git Bash 不能代替 Linux 组件准备环境。Windows 打包需要创建符号链接的权限，可启用 Windows 开发者模式。

## 发布包与签名

Linux x86_64 中可使用完整构建命令：

```bash
npm run build:android
```

只构建 arm64 发布包：

```bash
npm run android:proot
npx tauri android build --apk --target aarch64
```

以构建输出报告的 APK 位置为准。通常产物位于 `src-tauri/gen/android/app/build/outputs/apk/`，按架构和 debug/release 分目录保存。调试包已带调试签名；未签名发布包需使用自己的发布密钥签名。将 Android build-tools 加入 PATH 后执行：

```bash
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks release.keystore --out app-release.apk aligned.apk
apksigner verify --verbose app-release.apk
```

将第一条命令的输入文件名替换为构建实际输出的文件名。密钥库和密码单独保管，不加入源码。APK 对齐并不等于已验证设备的原生库页大小兼容性，发布前仍需在目标设备上测试。

## 安装到手机

打开手机开发者选项和 USB 调试，连接电脑，并在手机上允许该电脑调试。把待安装 APK 复制为当前目录下的 `app-debug.apk` 后执行：

```bash
adb devices -l
adb install -r app-debug.apk
adb shell am start -n com.deepseek.code/.MainActivity
```

`-r` 用于保留应用数据更新安装；更新包需与原包签名一致。清除数据或卸载应用会移除本机历史及 Ubuntu 环境，请提前备份重要项目。

## 检查环境与日志

以下数据检查适用于调试包：

```bash
adb shell run-as com.deepseek.code ls linux/rootfs/.deepseek-ready
adb logcat -d -s RustStdoutStderr Tauri/Console
```

就绪标记在下载、校验、解包和基础配置全部完成后才写入。未找到时检查网络及 `LinuxEnv` 日志，再重新打开应用。需要保存完整日志时：

```bash
adb logcat -d > android-logcat.txt
adb shell getprop ro.product.cpu.abi
adb shell getconf PAGESIZE
```

## 验证范围

已有开发记录覆盖 Android x86_64 模拟器的调试版本机流程，以及 arm64 真机上的本机问答、Ubuntu 命令、交互终端和远程模式。发布签名、不同页大小设备和公网 HTTPS 连接仍应分别验收。文档站构建成功只证明页面可生成，不代表 APK 或真机测试通过。
