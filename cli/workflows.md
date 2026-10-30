# 工作流

工作流是一段 JavaScript 脚本，按固定步骤编排多个子代理：先并行审查，再逐条核实，最后汇总。和 Claude Code 一样，模型通过 `Workflow` 工具启动工作流，工作流在后台运行，你可以用 `/workflows` 查看进度或停止。

工作流可能启动很多子代理、消耗大量 token，所以模型**只在你明确要求时**才使用它，例如你说"用工作流跑一下"、"让多个代理分头审查"，或者调用了要求使用工作流的技能和命令。其他情况下模型会改用单个子代理，或者先告诉你工作流大概要做什么、花多少，再问你。

## 脚本格式

脚本是普通 JavaScript（不是 TypeScript），必须以 `export const meta = {...}` 开头，`meta` 只能是字面量：

```javascript
export const meta = {
  name: 'review-changes',
  description: 'Review changed files and verify each finding',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const files = args.files
const reviews = await parallel(files.map(file => () =>
  agent(`Review ${file} for bugs. List concrete findings.`, { label: `review:${file}`, phase: 'Review' })
))
log(`reviewed ${reviews.length} files`)
return reviews
```

| API | 作用 |
|---|---|
| `agent(prompt, { label?, phase?, schema?, model? })` | 启动一个新的子代理，返回它的最终回答；给了 `schema`（JSON Schema）时返回符合它的对象。失败时抛出异常 |
| `parallel(tasks)` | 并发执行一组函数或 promise，按顺序返回结果 |
| `pipeline(items, ...stages)` | 每一项依次经过各阶段，各项之间互不等待 |
| `phase(title)`、`log(...values)` | 报告进度 |
| `args` | 调用时传入的参数，原样提供 |

- 脚本可以使用顶层 `await`，用 `return` 返回结果。
- 每个 `agent()` 是一个独立的 `dcl -p` 子进程，沿用当前会话的提供商、模型和权限模式；同时最多运行 4 个。
- 脚本最大 512 KiB，在 dcl 内置的 QuickJS 引擎中执行，不需要安装 Node.js。
- 工作流只能从主会话启动，子代理里不能再启动工作流。

## 保存的工作流

把脚本保存为 `.js` 或 `.mjs` 文件，就可以按名字调用：

- 项目：`.claude/workflows/名称.js`
- 用户：[数据目录](./data-directory.md)下的 `workflows/名称.js`

然后对模型说"运行 review-changes 工作流"即可，项目里的同名文件优先。

## 运行和恢复

- 调用后立即返回任务 ID，工作流在后台运行；完成时和后台命令一样通知模型，模型会查看结果。
- 每次调用都会把脚本保存到会话目录，并在结果里返回路径。要修改，让模型编辑这个文件，再用同一个 `scriptPath` 重新运行。
- `agent()` 的结果按（提示词、选项）缓存。用 `resumeFromRunId` 恢复之前的运行时，没有改动的调用直接使用缓存结果，只有修改过或新增的调用重新执行。恢复前先停止原来的运行。

## /workflows

在交互模式中输入 `/workflows`，列出本会话的工作流运行，最新的在前，每项显示状态、当前阶段、子代理数和开始时间。选中一项查看详情：

- 每个阶段和其中的子代理：运行中、完成、缓存、失败或已停止；
- 最新的日志；
- 运行中每秒刷新两次，按 `s` 停止。

没有交互终端时，`/workflows` 以文本列出运行记录。运行记录保存在数据目录的 `workflows/<会话ID>/<运行ID>/` 下：`run.json`（启动信息）、`progress.jsonl`（阶段、子代理和日志事件）、`status.json`（结束状态）。

也可以用 `/tasks` 查看后台任务，在任务视图里停止。

`/workflows list`、`/workflows show 名称`、`/workflows run 名称 [参数]` 用于另一种保存的工作流：放在同样两个目录里的 `.md` 文件，内容是一段任务说明，`run` 会把它作为后台任务交给模型执行。

## 内置的深度研究

`/deep-research 问题` 运行内置的研究工作流，见[联网搜索与深度研究](./web-search.md#deep-research)。它只在你明确输入这个命令时运行，模型不会自行启动。
