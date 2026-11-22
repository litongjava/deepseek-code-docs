# 进程内工具与子 Agent

## 进程内 MCP 工具

在 JVM 里实现工具，不需要单独部署 MCP 服务。Agent 以 `mcp__<server>__<tool>` 的名称调用，工具可以直接使用应用里的对象和连接。

```java
import java.util.Arrays;

import nexus.io.agent.sdk.Agent;
import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.PermissionMode;
import nexus.io.agent.sdk.json.JsonMaps;
import nexus.io.agent.sdk.mcp.SdkMcpServer;
import nexus.io.agent.sdk.mcp.SdkTool;
import nexus.io.agent.sdk.mcp.ToolResult;
import nexus.io.agent.sdk.message.ResultMessage;

public class InProcessTools {
  public static void main(String[] args) {
    SdkTool weather = new SdkTool("weather", "查询城市天气",
        JsonMaps.of("type", "object",
            "properties", JsonMaps.of("city", JsonMaps.of("type", "string")),
            "required", Arrays.asList("city")),
        arguments -> ToolResult.text(arguments.get("city") + "：晴，22°C"));

    AgentOptions options = new AgentOptions()
        .cliPath("dcl")
        .permissionMode(PermissionMode.BYPASS_PERMISSIONS)
        .mcpServer(SdkMcpServer.of("tools", weather));

    ResultMessage result = Agent.query("上海天气怎么样？", options, null);
    System.out.println(result.getResult());
  }
}
```

工具抛出的异常会作为 `isError` 结果返回给 Agent，会话继续进行，模型可以据此换一种做法。

使用 dcl 时，`SystemMessage.getTools()` 返回初始化消息中的工具名称清单。模型按需加载工具时，`ToolUseBlock.getName()` 返回 `ToolLoad`，`getInput().get("names")` 保留完整名称的数组，例如 `["ListDir","WebFetch"]`。名称区分大小写；若有未知或不可用的名称，dcl 在对应的 `tool_result` 中报告，整批都不会新增加载的工具。成功加载的新工具从下一次模型请求开始，按加载顺序追加在常驻工具之后。模型只看到一行确认，例如 `Loaded WebFetch. Available from the next request.`。SDK 的 `ToolResultBlock.getContentText()` 仍保留结构化 JSON 文本；应用可按调用 ID 关联结果，再读取 `content`、`loaded_tools`、`already_available` 和 `tools`。

## 子 Agent 与结构化输出

`agent` 定义可以被委派的子 Agent，`jsonSchema` 让最终结果符合指定结构，直接得到可以解析的数据。

```java
import java.util.Arrays;

import nexus.io.agent.sdk.Agent;
import nexus.io.agent.sdk.AgentDefinition;
import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.json.JsonMaps;
import nexus.io.agent.sdk.message.ResultMessage;

public class Structured {
  public static void main(String[] args) {
    AgentOptions options = new AgentOptions()
        .cliPath("dcl")
        .agent("reviewer", new AgentDefinition("审查代码改动", "你是严格的代码审查员。")
            .tools(Arrays.asList("Read", "Grep")))
        .jsonSchema(JsonMaps.of("type", "object",
            "properties", JsonMaps.of("issues", JsonMaps.of("type", "integer")),
            "required", Arrays.asList("issues")));

    ResultMessage result = Agent.query("审查 src 目录并统计问题数量", options, null);
    System.out.println(result.getStructuredOutput());
  }
}
```

如果子代理还要向队员分派工作，可以在其定义里设置 `skills`。使用 dcl 时，下面的定义让协调代理在启动时就得到内置技能 `task-template` 的正文，用来写清问题、具体改动、验证方法和报告要求：

```java
AgentDefinition coordinator = new AgentDefinition("向队员分派工作", "为每位队员写明任务和验收条件。")
    .set("skills", Arrays.asList("task-template"));
AgentOptions options = new AgentOptions().cliPath("dcl").agent("coordinator", coordinator);
```

该字段随 `initialize` 的 `agents.coordinator.skills` 发送，预加载作用于这个子代理。要在普通交互会话中也能调用模板，可用 `dcl skills state task-template user` 启用。
