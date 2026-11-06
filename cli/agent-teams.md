# 代理团队

代理团队让一个会话（队长）创建团队，同时启动多个子代理（队员）并发工作，队员之间可以按名字互发消息。适合可以拆成几个独立部分并行完成的任务。

代理团队目前是**实验功能**，需要设置环境变量开启：

```bash
export DEEPSEEK_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

## 相关工具

| 工具 | 作用 |
|---|---|
| `TeamCreate` | 创建团队，当前会话成为队长；一个会话只能带领一个团队 |
| `TeamSpawn` | 启动一个或多个队员（最多 8 个），并发运行，等待全部完成后返回各自的结果 |
| `SendMessage` | 队员之间、队员与队长之间发消息，`to` 写队员名字，`*` 广播 |
| `TeamDelete` | 解散团队；有队员仍在运行时会失败 |

## 示例

```bash
DEEPSEEK_CODE_EXPERIMENTAL_AGENT_TEAMS=1 dcl -m deepseek-flash --api-format anthropic \
  --permission-mode bypass -p "
1) TeamCreate 团队 docs。
2) TeamSpawn 两个成员：alice 写 alice.txt，介绍 Rust 所有权；bob 写 bob.txt，介绍 Rust trait，写完用 SendMessage 通知 alice。
3) 完成后 TeamDelete，并汇报结果。"
```

运行结果：
- 两个队员并发写好了各自的文件；
- bob 的消息送达 alice，alice 被唤起处理这条消息；
- 最后团队被解散。

## 说明

- **独立会话**：每个队员是一个独立的子会话，权限与队长相同。
- **按需唤起**：给已结束的队员发消息时，队长会在自己的回合内唤起它处理这条消息。
- **取消即全部停止**：取消队长的任务时，所有队员一起停止。
- **团队配置位置**：保存在[数据目录](./data-directory.md)的 `teams/<团队名>/config.json`，解散时清理。

## 相关文档

- [会话消息](./session-messages.md)
