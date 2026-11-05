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
