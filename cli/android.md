# 在 Android 上运行

dcl 可以在 Android 手机和平板上运行。配合 Termux，模型能使用 `git`、`python` 等完整的命令行工具，不需要 Root。

想要图形界面，可以使用 DeepSeek Code 的 Android 应用，它自带引擎，也能连接电脑上的服务器，见 [Android 使用指南](../android/index.md)及[桌面版运行原理与命令](../android/desktop-on-android.md)。

## 准备

1. 安装 [Termux](https://github.com/termux/termux-app/releases)，选择与手机匹配的版本，常见手机是 `arm64-v8a`。
2. 在 Termux 中安装常用工具：

   ```bash
   pkg update
   pkg install git python
   ```

3. 从源码交叉编译 Android 版 dcl，或把编译好的文件放到 Termux 主目录，然后加上执行权限：

   ```bash
   chmod +x ~/dcl
   ```

## 交叉编译

在 Linux 电脑上安装 Android NDK 和 Rust 目标：

```bash
rustup target add aarch64-linux-android
export NDK=<NDK 目录>/toolchains/llvm/prebuilt/linux-x86_64/bin
export CC_aarch64_linux_android=$NDK/aarch64-linux-android28-clang
export CXX_aarch64_linux_android=$NDK/aarch64-linux-android28-clang++
export AR_aarch64_linux_android=$NDK/llvm-ar
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER=$NDK/aarch64-linux-android28-clang
cargo build --release -p deepseek-code-cli --target aarch64-linux-android
```

## 使用

和其他平台一样配置模型后运行：

```bash
~/dcl
```

模型可以读写文件、运行命令和使用长期记忆。命令在 Termux 的 shell 中运行，用 `pkg install` 装好的工具模型都能调用。

录音、键鼠控制和工作流脚本依赖桌面环境或暂未提供的组件，在 Android 上调用时会给出提示。
