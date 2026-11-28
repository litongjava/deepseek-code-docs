# 查询与多轮会话

## 一次性查询

`Agent.query` 启动 CLI，完成一个任务后退出。传入回调可以边生成边处理消息，返回值是最后的 `ResultMessage`；不传回调的重载返回完整的消息列表。

## 多轮会话

`AgentClient` 保持一个 CLI 进程，可以连续提问，也可以在回合进行中查询状态或中断。它实现了 `AutoCloseable`，用 `try` 语句就能保证进程被回收。

```java
import nexus.io.agent.sdk.AgentClient;
import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.message.Message;
import nexus.io.agent.sdk.message.ResultMessage;
import nexus.io.agent.sdk.message.SystemMessage;

public class Conversation {
  public static void main(String[] args) {
    AgentOptions options = new AgentOptions().cliPath("dcl");
    try (AgentClient client = new AgentClient(options)) {
      client.connect();

      client.query("项目使用什么构建工具？");
      for (Message message : client.receiveResponse()) {
        if (message instanceof SystemMessage && ((SystemMessage) message).isInit()) {
          System.out.println("会话: " + message.getSessionId() + "，模型: " + ((SystemMessage) message).getModel());
        }
        if (message instanceof ResultMessage) {
          System.out.println(((ResultMessage) message).getResult());
        }
      }

      client.query("列出构建命令");
      ResultMessage second = client.awaitResult(null);
      System.out.println(second.getResult());
      System.out.println("上下文: " + client.getContextUsage().get("totalTokens") + " tokens");
    }
  }
}
```

## 读取消息的方式

- `receiveResponse()`：到下一条 `ResultMessage`（含）为止的消息，最常用。
- `receiveMessages()`：直到 CLI 结束的全部消息。
- `awaitResult(consumer)`：把消息交给回调，并返回这一轮的结果。
- `nextMessage(timeout, unit)`：带超时地取下一条消息，适合接入自己的事件循环。

## 消息类型

- `SystemMessage`：系统事件，`isInit()` 时包含会话 ID 和模型。
- `AssistantMessage`：助手回复，`getText()` 取文本，内容块包括文本、思考和工具调用。
- `UserMessage`：用户消息和工具结果。
- `ResultMessage`：一轮结束，包含结果文本、轮次和结构化输出。
- `StreamEvent`：开启 `includePartialMessages(true)` 后收到的增量事件，`getTextDelta()` 取增量文本，适合打字机效果。

接收 dcl 的输入建议时，同时设置 `initializeField("promptSuggestions", true)` 和 `includeRawFrames(true)`。有可用建议时，`RawMessage.getType()` 为 `prompt_suggestion`，`getRaw().get("suggestion")` 是建议文本，`getSessionId()` 标识会话。建议可在本轮 `result` 之后到达；在长连接上用 `nextMessage(...)` 或 `receiveMessages()` 继续读取。恢复时 dcl 可再次发送尚有效的建议，无需发起新的模型请求。

使用 `includeRawFrames(true)` 时，`RawMessage.getType()` 也可返回 `resource_alert`。从 `getRaw()` 读取 `kind`、`summary` 和 `details`。

收到 `compaction_notice` 类型的 `RawMessage` 时，用 `getRaw().get("message")` 读取提示文字。自动压缩失败而本轮仍能继续时，可以把警告显示给用户，然后继续读取到 `ResultMessage`。上下文实际重置时另有 `context_reset` 帧。SDK 尚未接通手动 `/compact` 帧，需要手动压缩时请在 CLI 终端恢复该会话。

## 查询已保存的会话历史

需要找回压缩前的路径、决定或报错时，dcl 的 SDK 持久会话也可使用 `ContextSearch`。模型先用 `ToolLoad` 加载 `{"names":["ContextSearch"]}`，再查询当前会话。应用可从返回的摘录中读取 `message_id` 和可用的 `tool_call_id`，定位原始记录。 完整参数见 [ContextSearch](/cli/tools#contextsearch)。

## 读取 Shell 任务结果

dcl 在 stream-json 的 `user` 消息里发送 `tool_result` 块。通过 `ToolResultBlock.getToolUseId()` 与之前的 `ToolUseBlock.getId()` 关联，按调用的工具名选择解析方式。前台 `Bash` 成功时，SDK 通常收到含 `stdout`、`stderr` 和 `exit_code` 的原始 JSON 文本。模型下一次请求收到的则是精简文本，例如只含标准输出，或静默成功时的 `(Completed with no output)`。长命令的模型预览可能附带 `Omitted output:`，SDK 应按原始结果字段读取。`Bash`、Shell 的 `TaskGet` 及 `Monitor` 的长 Base64 在模型上下文中显示为含文件路径和行号的占位符；Java 端仍按相应工具原有的结果格式读取，无需解析占位符。调用失败时先检查 `isError()`，正文可能带有 `Error: ` 前缀。

下面的方法处理已按 ID 确认为 `TaskGet` 的普通受管 Shell 快照。查询调用成功仍可能查到失败的任务，应读取快照的 `status`。已结束任务的 `output` 和 `result` 保留命令输出和必要状态；成功时无需匹配 `Exit code: 0`。

```java
import java.util.Map;
import nexus.io.agent.sdk.json.Json;
import nexus.io.agent.sdk.message.ToolResultBlock;

class ShellTasks {
  static void showSnapshot(ToolResultBlock block) {
    if (block.isError()) {
      System.err.println(block.getContentText());
      return;
    }
    Map<String, Object> task = Json.parseObject(block.getContentText());
    System.out.println(task.get("task_id") + " " + task.get("status"));
    if (task.get("output") instanceof String) {
      System.out.print(task.get("output"));
    }
  }
}
```

对于 Linux PTY 或 Windows ConPTY 任务，`metadata.interaction` 为 `pty`。其终态 `output` / `result` 是 JSON 字符串，如需退出码或清理状态，可以再解析该字符串。普通 Shell 的输出即使命令恰好打印了 JSON，也按命令正文处理。

## 恢复和分叉

- `resume(sessionId)`：恢复指定会话。
- `continueConversation(true)`：继续当前目录最近的会话。
- `forkSession(true)`：恢复时分叉出新会话，原会话不变。

使用 dcl 时，会话 ID 可从 `SystemMessage` 或 `ResultMessage` 的 `getSessionId()` 取得。恢复或交接会话会沿用保存的提供商和模型，需要切换时再显式指定模型。

在与 SDK 子进程相同的数据目录下，用 `dcl sessions list` 查看已保存会话，用 `dcl sessions export <id> --output session.jsonl` 导出其中一个。自定义目录时，两条命令都加上相同的 `--data-dir`。dcl 用 `global.db` 保存清单，用 `data/sessions/<storage_key>/session.db` 保存各会话历史。升级前的 `deepseek_code.db` 仍供旧版读取，新布局从空清单开始。导出文件是带 `header` 和校验记录 `end` 的 v1 JSONL 快照，需与实时 stream-json 消息分开读取。记录种类和校验步骤见[导出一个会话](/cli/data-directory#导出一个会话)。
