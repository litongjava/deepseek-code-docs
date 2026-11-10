# 首次启动与内置提供商

第一次运行 `dcl` 时，如果还没有任何可用的模型配置，dcl 会引导你接入一个提供商，默认推荐 DeepSeek。

## 已经设置了 DEEPSEEK_API_KEY

如果启动 dcl 的终端里已经设置了环境变量 `DEEPSEEK_API_KEY`，dcl 会直接使用 DeepSeek 的 `deepseek-flash` 模型，不出现引导。

## 引导流程

```text
Welcome to DeepSeek Code! Connect a model provider to get started.

Choose a provider:
   1. DeepSeek (recommended)
   2. Anthropic Claude
   3. OpenAI
   4. Moonshot Kimi (China)
   5. Zhipu GLM Coding Plan (China)
   6. MiniMax (China)
   7. Alibaba Qwen Token Plan (China)
   8. OpenCode Go
   9. OpenRouter
  10. Another OpenAI- or Anthropic-compatible endpoint
Number or saved provider ID [1]:
Get an API key at https://platform.deepseek.com/api_keys
Paste the API key (hidden), or press Enter to set DEEPSEEK_API_KEY yourself: ••••••••••••
Checking the connection with deepseek-flash…
Connected. DeepSeek is saved as the default provider (key stored in config.json, readable only by you).
```

1. **选择提供商**：直接回车选择 DeepSeek；输入编号选择其他提供商。已经保存过的提供商会列在下方，输入它的 ID 即可使用。
2. **提供 API Key**：
   - 如果对应的环境变量已经设置（例如 `MOONSHOT_API_KEY`），直接使用，不需要粘贴；
   - 否则可以把 Key 粘贴进来。输入时只显示圆点，Key 不会出现在终端记录里。它保存在[数据目录](./data-directory.md)的 `config.json` 中，该文件只有你自己可读写；
   - 也可以直接回车，按提示自行设置环境变量后重新启动。
3. **检查连接**：保存后，dcl 用所选模型发一个很小的请求验证 Key。失败时会显示原因，可以重新粘贴。
4. **选择默认模型**：提供商有多个模型时显示 `Choose the model to use` 列表，`Enter` 确认，`Esc` 选第一个；模型较多时（例如 OpenCode Go 的数十个）可以直接输入关键字筛选。之后新会话默认用这个模型，可以随时用 `/model` 修改。
5. **开始会话**：这个提供商成为默认提供商，直接进入会话。

## 内置提供商

| 提供商 | 默认模型 | API Key 环境变量 |
|---|---|---|
| DeepSeek | deepseek-flash、deepseek-v4-pro | `DEEPSEEK_API_KEY` |
| Anthropic Claude | claude-sonnet-4-5、claude-opus-4-6、claude-haiku-4-5 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-5.1、gpt-5-mini、gpt-4.1 | `OPENAI_API_KEY` |
| Moonshot Kimi（国内） | kimi-k2.7-code、kimi-k2-thinking | `MOONSHOT_API_KEY` |
| 智谱 GLM Coding Plan（国内） | glm-5.1、glm-4.7 | `ZAI_API_KEY` |
| MiniMax（国内） | MiniMax-M3、MiniMax-M2.7 | `MINIMAX_CN_API_KEY` |
| 阿里 Qwen Token Plan（国内） | qwen3.6-flash、deepseek-v4-flash、glm-5.1 | `QWEN_TOKEN_PLAN_API_KEY` |
| OpenCode Go | 全部模型，四种协议；常用 deepseek-v4.1-flash、grok-4.7、minimax-m3、gemini-4-argon | `OPENCODE_API_KEY` |
| OpenRouter | anthropic/claude-sonnet-4.5、anthropic/claude-opus-4.6 | `OPENROUTER_API_KEY` |

- **配置来源**：除 DeepSeek 外，这些提供商的接口地址、协议、上下文窗口和输出上限，都来自与 Desktop 共用的内置提供商目录，两端行为一致。
- **DeepSeek**：直接使用官方的 OpenAI 兼容接口 `https://api.deepseek.com`。
- **OpenCode Go**：一个 Key 覆盖四种协议，模型和地址来自内置目录，详见[接入 OpenCode Go](./opencode-go.md)。
- **其他接口**：选择最后一项，进入[`/provider add` 向导](./providers.md)，按编号选择协议，填写地址和凭据，再从接口返回的模型列表中选择要用的模型。

## 之后修改

- 新增或切换提供商：[模型与提供商](./providers.md)；
- 查看当前使用的提供商：[`/status`](./status.md)；
- 测试连通性：`/test`。
