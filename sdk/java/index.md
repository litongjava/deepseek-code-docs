# Java SDK 概览

Java SDK（`agent-cli-sdk`）让 Java 程序直接驱动 `dcl`：在自己的服务里发起任务、读取流式结果、审批工具调用，并把 JVM 里的方法作为工具提供给 Agent。

SDK 通过子进程启动 CLI，在标准输入输出上使用 [stream-json 控制协议](/cli/sdk)通信，因此：

- **零依赖**：不依赖任何第三方库，支持 Java 8 及以上版本，可以放进任何现有工程。
- **行为一致**：工具、权限、Hook、MCP 和会话都由 `dcl` 执行，与命令行使用时相同。
- **不绑定具体 CLI**：任何实现了 stream-json 控制协议的可执行文件都可以使用。

## 能做什么

- 一次性查询和长连接会话（多轮对话、排队消息、中断）
- 类型化消息：`SystemMessage`、`AssistantMessage`、`UserMessage`、`ResultMessage`、`StreamEvent`
- 工具权限回调，可以改写工具输入、附带权限规则
- Hook 回调，例如 `PreToolUse`、`PostToolUse`、`UserPromptSubmit`
- 进程内 MCP 服务器：在 JVM 里实现工具
- 子 Agent 定义、结构化输出和部分消息流
- 会话控制：切换模型和权限模式、查询上下文用量、回退文件等

## 安装

```xml
<dependency>
  <groupId>nexus.io</groupId>
  <artifactId>agent-cli-sdk</artifactId>
  <version>使用最新发布的版本</version>
</dependency>
```

也可以从源码安装到本地 Maven 仓库：

```bash
mvn clean install -DskipTests -Dgpg.skip
```

运行前先[安装 dcl](/cli/install) 并[配置模型提供商](/cli/providers)。

## 第一个程序

```java
import java.io.File;

import nexus.io.agent.sdk.Agent;
import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.PermissionMode;
import nexus.io.agent.sdk.message.AssistantMessage;
import nexus.io.agent.sdk.message.ResultMessage;

public class QuickStart {
  public static void main(String[] args) {
    AgentOptions options = new AgentOptions()
        .cliPath("dcl")
        .cwd(new File("."))
        .permissionMode(PermissionMode.ACCEPT_EDITS)
        .allowedTools("Read", "Grep", "Glob");

    ResultMessage result = Agent.query("总结 README.md 的内容", options, message -> {
      if (message instanceof AssistantMessage) {
        System.out.print(((AssistantMessage) message).getText());
      }
    });
    System.out.println();
    System.out.println("结果: " + result.getResult());
    System.out.println("轮次: " + result.getNumTurns());
  }
}
```

`cliPath` 也可以省略，改用环境变量 `AGENT_CLI_PATH` 指定 CLI 路径。

## 选择提供商与模型

CLI 可以同时保存多个提供商。用 `provider(...)` 指定提供商，用 `model(...)` 指定模型；只写模型 ID 而它在多个提供商下都存在时，CLI 会报 `Model exists in several providers`。也可以写成 `model("provider::model")`。

```java
AgentOptions options = new AgentOptions()
    .cliPath("dcl")
    .provider("opencode-go")
    .model("deepseek-v4.1-flash");
```

以 OpenCode Go 为例，它的模型分属四种协议，同一个提供商就能覆盖，切换模型即可：

```java
.model("deepseek-v4.1-flash")  // Chat Completions
.model("grok-4.7")             // Responses
.model("minimax-m3")           // Messages
.model("gemini-4-argon")       // Gemini
```

提供商需要先在 CLI 里保存，例如运行 `/provider add opencode-go`，或首次启动时选择 OpenCode Go，详见[接入 OpenCode Go](/cli/opencode-go)。

SDK 启动的子进程继承当前 JVM 的环境变量，因此在启动 JVM 前设置 `OPENCODE_API_KEY` 即可。需要从别处注入时用 `env("OPENCODE_API_KEY", key)`；SDK 不保存提供商配置，也不读取或缓存 Key。

## 接下来

- [查询与多轮会话](./sessions)
- [工具权限与 Hook](./permissions-hooks)
- [进程内工具与子 Agent](./tools-agents)
- [会话控制与选项](./control)
- [测试与示例应用](./testing)
