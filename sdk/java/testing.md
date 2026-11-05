# 测试与示例应用

## 运行测试

```bash
mvn test -Dgpg.skip
```

单元测试使用脚本化的传输层，不需要 CLI，也不访问网络。

端到端测试 `CliEndToEndTest` 在 JVM 内启动一个 OpenAI 兼容的模拟模型，驱动真实 CLI 走完 MCP 工具、权限、Hook 和控制请求的完整流程，不需要真实密钥。用环境变量启用：

- `AGENT_CLI_PATH`：CLI 路径。
- `AGENT_CLI_MOCK_ARGS`：让 CLI 连接模拟模型的参数，`{url}` 替换为模拟服务地址，`{data}` 替换为临时数据目录。

驱动 `dcl` 的例子：

```bash
AGENT_CLI_PATH=dcl \
AGENT_CLI_MOCK_ARGS="--data-dir {data} --base-url {url} --api-format openai --api-key-env AGENT_SDK_FIXTURE_KEY --model fixture-model" \
mvn test -Dgpg.skip
```

## 示例应用

SDK 仓库的 `examples/tio-boot-agent-demo` 是一个基于 tio-boot 的 Web 服务，展示如何在服务端使用 SDK：一次性查询、SSE 流式输出、多会话管理、回合中查询状态和中断。可以把它作为接入自己服务的起点。
