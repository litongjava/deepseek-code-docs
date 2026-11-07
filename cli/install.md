# 安装与构建

`dcl` 目前从源码构建。源码仓库根目录即 Cargo workspace，CLI 位于 `crates/cli`，可执行文件名为 `dcl`。

## 环境要求

- Rust 稳定版工具链（`cargo`、`rustc`）。
- Linux 需要以下系统开发库（Debian/Ubuntu 包名）：
  - `pkg-config`。
  - `libasound2-dev`：`dcl voice` 的麦克风采集（`cpal`）。
  - `libxdo-dev`：引擎的计算机操作能力（`enigo`）。
- 只构建 CLI 不需要 Node.js；构建 Desktop 需要 Node.js 22+。

在 Debian 或 Ubuntu 上，构建前执行：

```bash
sudo apt install pkg-config libasound2-dev libxdo-dev
```

## 构建

```bash
cargo build --locked -p deepseek-code-cli          # 调试版：target/debug/dcl
cargo build --locked --release -p deepseek-code-cli # 发布版：target/release/dcl
./target/debug/dcl --version
```

Cargo 输出统一放在 workspace 根目录的 `target/`。

## 没有 root 权限时的 Linux 构建

如果系统缺少上面的 `-dev` 包而又无法使用 `sudo`，可以只下载包并解压到用户目录，再让 `pkg-config` 和链接器指向那里：

```bash
mkdir -p ~/debs && cd ~/debs
apt-get download libasound2-dev libxdo-dev
for d in *.deb; do dpkg -x "$d" ~/.local/sysroot; done

# -dev 包里的 .so 是相对符号链接，改为指向系统已安装的运行库
L=~/.local/sysroot/usr/lib/x86_64-linux-gnu
ln -sfn /usr/lib/x86_64-linux-gnu/libasound.so.2.0.0 $L/libasound.so
ln -sfn /usr/lib/x86_64-linux-gnu/libxdo.so.3        $L/libxdo.so

export PKG_CONFIG_PATH=$L/pkgconfig
export PKG_CONFIG_SYSROOT_DIR=~/.local/sysroot
export RUSTFLAGS="-L $L"
```

前提是对应的运行库（`libasound2`、`libxdo3`）已经安装。

如果 `/usr/local/cargo` 等共享 `CARGO_HOME` 对当前用户只读（报错 `failed to create directory .../registry/cache ... Permission denied`），改用用户自己的目录，并复制镜像源配置：

```bash
mkdir -p ~/.cargo && cp /usr/local/cargo/config.toml ~/.cargo/ 2>/dev/null
export CARGO_HOME=~/.cargo
```

## 验证

```bash
cargo test --locked -p deepseek-code-cli
cargo test --locked -p deepseek-code-core --lib --tests
```
