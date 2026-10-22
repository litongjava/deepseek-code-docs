# 团队同步

团队同步让团队成员共享**团队记忆**，例如架构决定、约定、值班安排，并且可以让模型在回答时参考这些内容。数据通过一个自部署的同步服务交换。

- **只同步显式共享的内容**：只有你用 `team-sync create` 创建或导入的团队记忆会被同步，个人记忆、提供商配置和 API Key 都不会上传。
- **与 Claude.ai Team 无关**：这是 dcl 自己的协议，不是 Claude.ai Team 的 OAuth 登录。

## 启动服务端

服务端的 token 与团队的对应关系由运维提供：token 至少 16 个字符，每个 token 只能访问一个团队。

```bash
export TEAM_SERVER_TOKENS='{"tok-engineering-0001":"engineering"}'
dcl --data-dir ~/team-server team-sync serve --bind 127.0.0.1:38080
```

默认只绑定本机回环地址。生产环境请放在 HTTPS 反向代理之后，并备份服务端的数据目录。

## 客户端登录

每个成员在自己的机器上（或用各自的数据目录）登录。`auth` 会先实际请求一次服务端验证 token，通过后才保存：

```bash
export TEAM_SYNC_TOKEN=tok-engineering-0001
dcl team-sync auth engineering --endpoint http://127.0.0.1:38080
dcl team-sync status
```

token 无效或属于另一个团队时，返回 `Team authentication returned HTTP 401 Unauthorized`。

## 日常使用

| 命令 | 作用 |
|---|---|
| `team-sync create '标题' --content '内容' --tags a,b` | 新建一条团队记忆 |
| `team-sync update <ID> '标题' --content '新内容'` | 修改；省略 `--tags` 时保留原标签，`--tags ''` 清空 |
| `team-sync delete <ID>` | 删除，以墓碑记录同步给其他成员 |
| `team-sync sync` | 上传本地改动并拉取他人的改动 |
| `team-sync list [--include-deleted]` | 列出团队记忆 |

## 冲突处理

两个成员同时修改同一条记忆时，后同步的一方会得到冲突，双方版本都会保留：

```bash
dcl team-sync conflicts                       # 查看本地和远端两个版本
dcl team-sync resolve <ID> --keep local       # 以本地为准，基于远端版本重新上传
dcl team-sync resolve <ID> --keep remote      # 接受远端版本（包括删除）
dcl team-sync sync
```

- 离线或超时时，本地待上传的改动不会丢失，下次同步时重试。
- 重复发送同一个修改不会重复创建记忆，也不会让版本号多加一次。

## 让模型使用团队记忆

默认不会把团队记忆发给模型。在需要的项目里开启：

```bash
dcl team-sync context --enabled true
```

之后在这个项目里提问，模型可以引用团队记忆，例如回答"下个版本的代号是什么"。

## 后台定时同步

```bash
dcl services start team-sync --interval 60    # 每 60 秒同步一次，前台运行
dcl services status
dcl services stop team-sync                   # 在另一个终端停止
```

## 导入旧版团队数据

```bash
dcl team-sync import-legacy ~/.claude-code/team --preview   # 先预览
dcl team-sync import-legacy ~/.claude-code/team
```

导入时保留原来的 ID，源目录不会被修改，旧的 `.team_token` 不会导入。遇到 ID 冲突时整个导入回滚。
