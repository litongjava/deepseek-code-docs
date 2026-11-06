# 在浏览器和手机上使用

DeepSeek Code 可以在桌面、浏览器和手机上使用。界面和引擎可以分开运行。`dcd-server` 在一台电脑或服务器上运行引擎，并直接提供网页界面；之后用任何浏览器、手机浏览器或 Android 应用打开它，看到的是和桌面版相同的会话、项目、模型和工具。

这样做的好处：

- 模型调用、命令执行和文件读写都发生在运行 `dcd-server` 的机器上，手机只负责显示和输入。
- 会话保存在服务器的数据目录，换设备继续同一个会话。
- 桌面版和 `dcd-server` 使用同一种数据目录格式，可以在两者之间切换。

## 启动服务器

从源码构建：

```bash
npm ci
npm run build
cargo build --release -p deepseek-code-desktop --bin dcd-server
```

在仓库目录运行时，`dcd-server` 会自动使用 `dist` 里的网页；放到其他位置时，把网页目录复制到程序旁边的 `web` 目录，或用 `--web-dir` 指定。

```bash
dcd-server
```

第一次启动会生成访问令牌并打印出来，同时保存到数据目录的 `server-token` 文件（只有当前用户可读）。以后再查看：

```bash
dcd-server --print-token
```

默认只监听本机 `127.0.0.1:30085`。在浏览器打开 `http://127.0.0.1:30085`，输入访问令牌即可进入。

数据目录与桌面版相同（`DEEPSEEK_CODE_DATA_DIR`，默认 `~/.deepseek-code`）。同一个数据目录同一时间只运行桌面版和 `dcd-server` 中的一个。

## 让其他设备访问

监听网络地址时，需要选择以下一种方式，否则 `dcd-server` 拒绝启动。推荐使用 HTTPS。

**直接提供 HTTPS**，使用 PEM 格式的证书链和私钥：

```bash
dcd-server --host 0.0.0.0 --port 8443 --tls-cert cert.pem --tls-key key.pem
```

**由反向代理提供 HTTPS**（如 Caddy、Nginx），`dcd-server` 只监听本机，代理转发到它：

```bash
dcd-server --behind-https-proxy
```

代理需要转发 `Host` 头，并关闭响应缓冲，以便聊天内容逐字显示。Nginx 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name dcd.example.com;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    client_max_body_size 100m;          # 上传附件

    location / {
        proxy_pass http://127.0.0.1:30085;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;   # 保留端口，与浏览器的 Origin 一致
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;                # 聊天内容逐字显示
        proxy_read_timeout 1h;              # 长时间运行的任务
    }
}
```

`Host` 要用 `$http_host`：HTTPS 不在 443 端口时，它带上端口，`dcd-server` 据此确认请求来自本站页面。Nginx 和 `dcd-server` 不在同一台机器时，`dcd-server` 加 `--host <内网地址>`，并只允许 Nginx 所在机器访问该端口。

**直接使用 HTTP**，适合局域网、Tailscale 等可信网络，或者 HTTPS 由其他设备统一提供的场景：

```bash
dcd-server --host 0.0.0.0 --allow-http
```

之后在浏览器打开 `http://<服务器地址>:30085`。启动时会提示令牌以明文传输。浏览器只允许 HTTPS 页面使用部分功能，在 HTTP 页面上：

- 复制按钮照常可用。
- 语音输入不可用，点击麦克风时弹窗说明原因。
- “添加到主屏幕”生成的是普通书签，打开时带浏览器地址栏，不能全屏。

需要这些功能时改用 HTTPS。

安全设计：

- 所有接口都需要访问令牌；网页登录后，令牌保存在 HttpOnly、SameSite=Strict 的 Cookie 中，网页脚本读不到。
- 只接受本站页面和 DeepSeek Code 应用的请求，其他网站即使让用户的浏览器发请求也会被拒绝。
- 访问令牌等同于在这台机器上执行命令的权限，只发给信任的人。要更换令牌，删除 `server-token` 后重启，旧令牌立即失效。

需要让其他网页地址调用接口时，用 `--allow-origin https://example.com` 加入允许列表，可以重复使用。

## 在手机上使用

**手机浏览器**：打开服务器地址并登录即可。窄屏上侧边栏变为抽屉，点左上角按钮打开，选中会话后自动收起。在浏览器菜单中选择“添加到主屏幕”，之后可以像应用一样全屏打开。

**Android 应用**：应用自带完整引擎，打开即可在手机上使用，不需要电脑或服务器。在“设置”中添加模型供应商后就能对话，会话和设置保存在应用的私有目录中。

应用内置一个 Ubuntu 环境，模型的命令在其中运行，`bash`、`apt` 等都可以直接使用，需要的软件让模型用 `apt-get install` 安装即可，例如 `git`、`python3`、`nodejs`。整个环境无需 Root。首次打开时应用会在后台下载约 30 MB 的 Ubuntu 基础系统并校验，完成前命令使用系统自带的 Shell。

任务进行时，应用在通知栏显示“正在本机运行”，切到其他应用后任务继续执行；从最近任务中划掉应用即停止。

需要使用电脑上的项目和工具时，在左下角用户菜单选择“连接服务器”，填写服务器地址（如 `https://server.example:8443`）和访问令牌，以后自动连接。登录页的“在本机运行”可以随时切回手机上的引擎。

构建 Android 应用需要 Android SDK、NDK 和 Java，设置 `ANDROID_HOME`、`NDK_HOME`、`JAVA_HOME` 后执行：

```bash
npm run build:android
```

该命令先下载 Ubuntu 环境所需的 PRoot 组件（按固定的 SHA-256 校验），再构建 APK。Android 工程已在仓库中，应用会自动避开状态栏、导航栏和键盘，不会被遮挡。

调试安装包可以先运行 `npm run android:proot`，再执行 `npx tauri android build --apk --debug --target x86_64`，在模拟器上运行。

## 哪些功能只在桌面版提供

浏览器和手机通过服务器使用全部对话、项目、模型、工具、技能、长期记忆和定时提示等功能。以下功能操作的是“运行界面的这台电脑”，只在桌面版提供，点击时会提示需要桌面版：

- 系统文件对话框、在文件管理器中显示、用默认程序打开文件。
- 窗口、托盘、键鼠控制和屏幕截图。
- 麦克风语音输入。

## 在浏览器中选择项目文件夹

新建或编辑项目时点击“浏览文件夹”，选择框列出服务器上的目录：点击文件夹进入下一级，“上一级”和“主目录”快速跳转，也可以在顶部输入路径后点“打开”。到达目标目录后点“使用此文件夹”。默认不显示以点开头的隐藏文件夹，需要时勾选“显示隐藏文件夹”。

选择框只读取目录名称，不读取文件内容，同样需要登录后才能使用。

## 弱网下使用

网页版为慢速和不稳定的网络做了优化：

- 网页和接口数据压缩传输，首次打开约 1.5 MB；之后再打开，网页文件直接使用浏览器缓存，不再下载。
- 会话中重复的系统提示词和工具定义只传一份，长会话打开更快。
- 页面空闲时几乎不发请求：回答生成期间才频繁检查状态，切到后台的标签页停止检查。
- 网络断开时提示“无法连接服务器”，已输入的内容保留在输入框中，恢复后直接发送即可。

## 常见问题

**登录页提示无法连接服务器**：确认 `dcd-server` 正在运行，地址和端口正确，手机与服务器网络互通。使用自签名证书时，先在手机上信任该证书。

**提示访问令牌不正确**：在服务器上运行 `dcd-server --print-token`，复制完整内容，不要带空格。

**聊天内容一次性出现，而不是逐字显示**：检查反向代理是否缓冲了响应。

**打开页面是白屏**：在浏览器开发者工具的 Network 中查看 `/assets/` 下的文件。返回 403 时，检查反向代理是否用 `$http_host` 转发了 `Host` 头。
