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

## 恢复和分叉

- `resume(sessionId)`：恢复指定会话。
- `continueConversation(true)`：继续当前目录最近的会话。
- `forkSession(true)`：恢复时分叉出新会话，原会话不变。

会话与 `dcl` 共用同一份数据，也可以在终端用 `dcl --resume` 打开。
