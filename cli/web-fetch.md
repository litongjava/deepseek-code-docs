# WebFetch

参数：`url`、`prompt`，可选 `offset`。`WebFetch` 先将网页转为清洁文本：

- **短页直返（≤ 20,000 字符）**：直接返回清洁后的正文，不再额外调用模型做摘要，响应更快且无信息折损。
- **长页摘要（> 20,000 字符）**：使用当前会话的模型按 `prompt` 回答（输出最多 8,192 token，上下文较小时会扣除输入和协议开销再确定预算，默认关闭深度思考；若上游 HTTP 400/422 拒绝关闭思考参数，自动按会话原思考设置重试一次）。若摘要仍超输出上限或为空，自动优雅降级返回前 20,000 字符并附带 `next_offset`，模型可继续分段读取。

终端里显示为 `Fetch(https://...)`。网页文本中的长 Base64 数据会先折叠为一行占位符。需要原始响应正文时，可通过 `Bash` 运行 `curl -o page.html https://example.com/`。

- **内容协商**：直接抓取时默认发送 `Accept: text/markdown, text/html, */*`。响应类型为 `text/markdown`（可带 `charset`）时按 Markdown 读取，HTML 则提取可读正文。
- **缓存与超时**：同一个 URL 15 分钟内重复读取直接使用缓存；单次抓取上限 2 MiB，请求超时 **30 秒**（建连超时 **10 秒**），Jina Reader 兜底超时 **30 秒**。
- **协议与重定向**：没有匹配的明文授权时，公网 `http://` 先试 `https://`，不会静默回退到 HTTP。HTTPS 抓取可跟随同主机及跨主机公网重定向（最多 10 跳），但严格拦截公网跳转到本机/内网地址（防 SSRF）。仅支持 HTTP/HTTPS，`file://`、`ftp://` 等协议继续拒绝。
- **Jina Reader 自动兜底**：访问公网页面遇到网络错误、HTTP 401/403/406/429/5xx，或抓到明显的 JS 空壳页（HTML ≥ 1 KiB 但提取正文 < 200 字符）时，自动通过 `https://r.jina.ai/<url>` 补抓。本机/内网地址、`raw` 原始读取、带自定义请求头或目标本身已是 `r.jina.ai` 时不触发。
- **HTTP 代理配置**：可在 `config/config.json` 中单独配置 `web_fetch.proxy`（仅支持 `http://` 与 `https://`，每次调用实时生效无需重启），未配置时沿用环境变量 `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`；访问本机/回环/内网地址时始终绕过代理：
  ```bash
  dcl config set fetch.proxy http://127.0.0.1:10808
  dcl config set fetch.proxy ""    # 清除代理
  ```
  也可在交互界面通过 `/config fetch-proxy` 或 `/config` 面板的 `Web fetch proxy` 项设置。
- **本机与内网审批**：`localhost`、回环、内网、链路本地地址和不带点的主机名保留原协议。本地 HTTPS 按本地网络权限处理；本地 HTTP 还需要明文授权，普通工具批准或 bypass 模式本身不是明文授权。
- 页面较长时分段读取：结果带有 `next_offset` 时，用它作为按字符计的 `offset` 继续读。非空页面读到或超过末尾时，直接返回 `Nothing left to read from offset N: this page's text is M characters long.`，无需再调用模型。
- 需要登录的私有页面会失败，请改用有认证的 MCP 工具或 `gh` 等命令。

新域名的审批还取决于权限模式和域名规则，见[访问新网站](./permissions.md#访问新网站)。

## 为什么 WebFetch 应允许按原始 HTTP 链接读取公开网页？

HTTPS 应当是首选，但把链接开头的 `http://` 改成 `https://`，并不能让网站支持 HTTPS。有些公开资料仍然只能通过 HTTP 读取。支持直接访问 HTTP 的理由是让这类资料仍然可读，而不是把明文传输当作安全连接。

### 一个能打开却抓不到的页面

2026 年 11 月 28 日排查河南某局移动站的一篇文章时，传给 WebFetch 的原始链接是 `http://m.xfj.henan.gov.cn/2026/08-03/3382115.html`。同一台机器访问同一主机和路径，只替换协议，得到两个结果：

| 协议 | 实际结果 |
| --- | --- |
| HTTP | 原站返回 `200 OK` 和页面正文，没有重定向到 HTTPS。 |
| HTTPS | 对端出示的证书不覆盖 `m.xfj.henan.gov.cn`，客户端在取得正文前终止连接。 |

当时的 WebFetch 在发出请求**之前**就把公网 HTTP 改成了 HTTPS。所以日志开头是 `Fetch(http://...)`，报错却是 `certificate not valid for name`。随后 Jina Reader 请求的仍是升级后的 HTTPS 地址，返回了 `422`。两次失败都没有验证原始 HTTP 页面能否读取。

**WebFetch 的问题不在于拒绝错误证书——这个拒绝是正确的。问题在于，它只试了改写后的地址，没有给用户选择原始地址的机会。** 网站运营方可以通过正确配置该域名的 HTTPS 证书来修复这个站点，但 WebFetch 的用户通常不控制来源网站。

### 明文 HTTP 的四档授权

内网知识库往往有许多页面，却没有 HTTPS。用户可以只批准一次读取，也可以记住对这个站点的决定，不必每打开一篇文章就确认一次。以下是原生引擎中 `WebFetchHttp` 审批的规则。

例如，首次读取 `http://wiki.intra:8080/guide` 时，提示：「允许 WebFetch 通过明文 HTTP 读取此页面吗？网络中的第三方可能看到请求或修改返回的内容。」同时展示页面地址和授权站点 `http://wiki.intra:8080`。

| 选择 | 对哪些请求生效 |
| --- | --- |
| 仅当前页面 | 只允许这一次读取，不保存。再次读取同一页，或跳转到另一个 HTTP 页面，都不沿用这次同意。 |
| 本次会话允许此站点 | 当前会话可读取该站点的其他页面；新会话重新询问。 |
| 记住到当前项目 | 当前用户今后在这个项目读取该站点时不再询问，不影响其他项目或同事。 |
| 记住到全局 | 当前用户在本机所有项目都可读取**这个站点**，不是允许所有 HTTP 网站。 |

也可选「不允许」。按 Esc 取消，或需要确认时无人应答，都不发送明文请求。要查看或撤销已保存的授权，请使用同一个应用数据目录：

```text
dcl config http-grants list
dcl config http-grants revoke ID
```

`list` 返回 JSON 列表。先核对 `origin` 和 `scope`，再把 `ID` 替换为该行的数字 `id`。撤销只删除这一条；如果还有其他匹配授权，仍可读取。「仅当前页面」不会出现在列表中。

**SDK（stream-json）：** 收到 `control_request` 时，检查 `request.subtype` 为 `can_use_tool`、`request.tool_name` 为 `WebFetchHttp`。向用户展示 `request.input` 中的 `url`、`origin`、`local` 和可选的 `reason`。按原 `request_id` 回复 `control_response`：内层决定例如 `{"behavior":"allow","httpScope":"http_once"}`。`httpScope` 必须从 `request.httpScopes` 中选择（`http_once`、`http_session`、`http_project`、`http_user`）；不能修改输入或附带 `updatedPermissions`。拒绝用 `{"behavior":"deny"}`。仅回复 `allow` 不授权。

**什么时候询问：**

- **内网 HTTP：** 保留原协议。没有匹配授权时，把内网访问和明文风险合并为一次询问。
- **公网 HTTP：** 没有匹配授权时先试 HTTPS，成功就不打扰用户。升级失败而需要按原地址读取时，说明失败原因，再询问是否允许明文读取。已有匹配授权时，可按原 HTTP 地址读取。
- **原始链接是 HTTPS：** 正常校验证书。即使此站点已有 HTTP 授权，也不因 HTTPS 失败而降级。

**授权边界：** 站点按协议、主机和端口匹配，不包含其他子域或端口。每次重定向都重新检查目标，继续拦截公网到内网的跳转。以上授权只允许 WebFetch 读取，不覆盖显式拒绝规则，不允许明文发送 Cookie、认证头或含令牌的 URL，也不把内网页面交给第三方 Reader。实际使用 HTTP 时，结果标注「HTTP 明文」。

### 为什么不能静默回退？

公开不等于可信：即使文章不需要保密，使用 HTTP 仍会让网络中间方看到访问路径，也可能让对方替换正文。对于 WebFetch，这意味着模型可能把被改写的文字当作原站材料引用。自动回退还会让干扰 HTTPS 连接的一方有机会迫使客户端改走明文。因此，不应自动降低保护，也不应通过关闭 TLS 证书校验来消除报错。

这项取舍保留了两件不同的事：**用户可以知情选择读取一份只能用 HTTP 取得的公开资料；WebFetch 不能据此声称已经验证了它的来源。** 如果结论依赖原文的真实性，应另找证书有效的官方 HTTPS 来源核对。
