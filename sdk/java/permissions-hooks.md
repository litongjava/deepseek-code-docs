# 工具权限与 Hook

## 工具权限

`canUseTool` 让 Java 代码决定每一次需要确认的工具调用。没有设置时，需要确认的调用都会被拒绝，默认就是安全的。

```java
import java.util.Map;

import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.PermissionMode;
import nexus.io.agent.sdk.permission.CanUseTool;
import nexus.io.agent.sdk.permission.PermissionResult;
import nexus.io.agent.sdk.permission.ToolPermissionContext;

public class Permissions {
  public static AgentOptions options() {
    CanUseTool policy = (String toolName, Map<String, Object> input, ToolPermissionContext context) -> {
      if ("Bash".equals(toolName) && String.valueOf(input.get("command")).contains("rm -rf")) {
        return PermissionResult.deny("禁止删除目录");
      }
      if ("Write".equals(toolName)) {
        // 允许，并采纳 CLI 建议的会话规则，之后同类写入不再询问
        return PermissionResult.allow(input, context.getSuggestions());
      }
      return PermissionResult.allow();
    };
    return new AgentOptions()
        .cliPath("dcl")
        .permissionMode(PermissionMode.DEFAULT)
        .canUseTool(policy);
  }
}
```

- `PermissionResult.allow(updatedInput)`：允许，并改写工具输入。
- `PermissionResult.deny(message)`：拒绝，模型会读到原因并调整做法。
- `PermissionResult.denyAndInterrupt(message)`：拒绝并结束整个回合。

权限模式的含义见 [权限模式与工具审批](/cli/permissions)。

## Hook

Hook 回调运行在你的 JVM 里，可以观察事件，也可以阻止操作。

```java
import java.util.Map;

import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.hook.HookEvent;
import nexus.io.agent.sdk.hook.HookMatcher;
import nexus.io.agent.sdk.json.JsonMaps;

public class Hooks {
  public static AgentOptions options() {
    return new AgentOptions()
        .cliPath("dcl")
        .hook(HookEvent.PreToolUse, HookMatcher.of("Bash", (Map<String, Object> input, String toolUseId) -> {
          Map<String, Object> toolInput = JsonMaps.object(input, "tool_input");
          if (String.valueOf(toolInput.get("command")).startsWith("git push")) {
            return JsonMaps.of("hookSpecificOutput", JsonMaps.of(
                "hookEventName", "PreToolUse",
                "permissionDecision", "deny",
                "permissionDecisionReason", "推送需要人工确认"));
          }
          return JsonMaps.of();
        }).withTimeout(30))
        .hook(HookEvent.PostToolUse, HookMatcher.all((input, toolUseId) -> {
          System.out.println("工具完成: " + input.get("tool_name"));
          return JsonMaps.of();
        }));
  }
}
```

`HookMatcher.of` 按工具名匹配，`HookMatcher.all` 匹配全部工具，`withTimeout` 设置回调的超时秒数。
