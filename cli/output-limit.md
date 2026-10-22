# 输出上限与自动续写

模型每次回复的长度有上限（`max_tokens`）。回复达到上限时会被截断，比如模型正在用 `Write` 写一个大文件，写到一半就停了。dcl 会自动处理这种情况。

## 默认上限

| 模型 | 默认上限 |
|---|---|
| DeepSeek 模型 | 32000 tokens |
| Claude Opus 4.6 | 64000 tokens |
| 其他 Claude 4.x、Claude 3.7 | 32000 tokens |
| Claude 3.5、Claude 3 Sonnet | 8192 tokens |
| Claude 3 Opus、Claude 3 Haiku | 4096 tokens |
| 其他 OpenAI 兼容接口 | 8192 tokens |

- **Claude 模型**：沿用 Claude Code 按模型给的默认值。
- **DeepSeek**：思考内容也计入输出，所以默认值较大；DeepSeek API 本身接受更高的上限。
- **其他兼容接口**：很多接口的上限低于 32000，传入更大的值会直接报错，所以保守地使用 8192。

可以调整：

```bash
dcl --max-tokens 64000
dcl config set max_tokens 64000   # 保存到 CLI 提供商
```

如果对话已经很长，"输入 + 输出上限"超过了模型的上下文窗口，dcl 会自动把这一次的输出上限缩小到剩余空间；剩余空间不足 4096 tokens 时，才提示你先用 `/compact` 压缩对话。

## 被截断时会发生什么

1. **不执行被截断的工具调用**：工具调用的参数不完整，执行它可能写出半个文件，所以直接跳过，并显示为失败：`Not run: the response reached the output token limit before this call was complete.`
2. **自动续写**：dcl 保留已经输出的文字，告诉模型"输出被截断了，被截断的工具调用没有执行，请从中断处继续，大文件分几次写"，然后让它接着回答。界面上会显示：

   ```text
   Output reached the 32000-token limit; asking the model to continue (1/3).
   ```

3. **最多续写 3 次**：仍然被截断时，这一轮才结束，并提示：

   ```text
   The response was cut off at the output token limit even after automatic continuations;
   send a follow-up to continue or raise the limit with --max-tokens.
   ```

   这时发送一条"继续"之类的消息，或者用更高的 `--max-tokens` 重新启动。

续写的做法和 Claude Code 相同：最多 3 次，并要求模型直接从中断处继续，不道歉、不重复已经写过的内容。
