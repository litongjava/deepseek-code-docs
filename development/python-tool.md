# Python 工具实现规范

## 1. 背景与目标

Agent目前只能通过 `Bash` 工具运行 Python：

```python
python - <<'PY'
print("hello")
PY
```

这条路径有三个问题：

1. **多一层 shell**。PowerShell → bash → python 三层引号嵌套，Windows 上极易出错。
2. **解释器不确定**。Git Bash 和 PowerShell 看到的 `PATH` 不同，`python` 可能解析到不同环境，甚至落到 Microsoft Store 的占位程序。
3. **输出与错误格式被 shell 包装**，`stdin`、退出码、超时语义都要穿过 shell。

本工具的目标是提供一个**只跑 Python、不过 shell**的轻量执行通道：

- 模型给一段 Python 源码，工具选择解释器、写脚本、执行、返回文本结果；
- 支持前台/后台、超时、`cwd`、环境变量、显式指定解释器或 conda 环境；
- 可选把脚本保存到工作区 `temp/` 下，便于复跑与排查；
- 与 `Bash` 共用同一套进程捕获、任务接管、权限和沙箱设施。

## 2. 范围

### 2.1 做

- 新增内置工具 `Python`，默认按需加载（`ToolLoad`）。
- 入参：`code`、`save_name`、`env`、`interpreter`、`conda`、`cwd`、`timeout`、`run_in_background`、`description`。
- 前台复用 `background_shell::run_foreground`，后台复用 `background_shell::start`。
- 复用 `bash_process` 的有界输出捕获、超时杀进程树、任务日志。
- 接入现有权限规则、沙箱、Desktop/CLI 审批展示。
- 传 `save_name` 时把脚本保存到 `<workspace>/temp/<save_name>`，并在结果里返回绝对路径。

### 2.2 不做

- 不保存运行时状态（变量跨调用保留）——那是 kernel，不在本工具范围。
- 不做富输出（图片、DataFrame 表格、Jupyter 协议）。
- 不提供 `path`/脚本文件模式；跑已有脚本或 `python -m ...` 继续用 `Bash`。
- 不暴露 `-I` 开关；不可信代码走 `Bash` 并显式加 `-I`。
- 不提供 `dangerouslyDisableSandbox`；需要绕过沙箱时用 `Bash` 或改设置。
- 不负责安装依赖、创建虚拟环境。

## 3. 定稿决策

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 工具名 | `Python` | 与 `Bash`、`Read` 一样首字母大写 |
| 加载方式 | `enabled: false, on_demand: true` | 不进 `CORE_TOOLS`，由 `ToolLoad` 拉取 |
| 执行方式 | 脚本（临时或 `temp/` 下保存）+ `python -X utf8 -u <script>` | 前后台同一条路径；`__file__` 存在；`input()` 读 EOF 不阻塞 |
| 脚本保存 | `save_name` 可选，落在 `<workspace>/temp/python/<save_name>` | 便于复跑与排查；限制在 `temp/` 内，避免变成任意文件写入 |
| `PYTHONPATH` | 合并而非替换，工作区优先 | 保证项目内 `import` 不被模型的覆盖值破坏 |
| 解释器 | `interpreter` XOR `conda`，都不传走默认解析 | 模型可用 `Bash` 查询后显式指定 |
| 权限 | 新规则族 `Python(*)`，完全信任 | 与 `Bash(python:*)` 等价；代码无法静态审查 |
| 危险命令预检 | 接，但对代码基本是空操作 | 保持结构一致，不能当作代码审查 |
| 计划模式 | 不加入 `manager.rs` 的 `shell` 分支 | 否则空 command 会被误判为安全并放行 |
| 沙箱 | 必须接入 | 否则开启沙箱时 Python 会成为未隔离的旁路 |
| 解释器回显 | JSON 每次带；模型预览只在与请求不一致时显示；默认解释器进环境块 | 避免每次调用重复一行，同时保留可审计性 |

## 4. 工具定义

### 4.1 名称与加载

- 名称：`Python`
- 文件：`crates/core/src/tools/python.rs`
- 默认加载：`ToolLoading { enabled: false, on_demand: true }`
- 不加入 `crates/core/src/services/customization.rs` 的 `CORE_TOOLS`

### 4.2 Schema

```json
{
  "type": "object",
  "properties": {
    "code": {
      "description": "Python source to run as __main__. Python only: shell syntax such as pipes, redirection, $VAR and && is not interpreted. Use Bash for `python -m ...`, scripts with arguments, or untrusted code. The code runs from a file, so __file__ is set; stdin is empty, so input() returns EOF.",
      "type": "string"
    },
    "save_name": {
      "description": "Optional. Save the script under <workspace>/temp/<save_name> instead of a temporary file, and return the absolute path as script_path. Must be a relative .py path without .., for example python/script/001.py. An existing file is overwritten. Omit to run from a temporary file that is deleted after the call.",
      "type": "string"
    },
    "env": {
      "description": "Optional environment variables merged over the inherited environment for this run. Use it for values that must exist before the interpreter starts, such as PYTHONPATH, PYTHONWARNINGS or PYTHONUNBUFFERED. Do not put secrets here: tool inputs are stored in the session transcript. At most 32 keys and 16 KiB.",
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "interpreter": {
      "description": "Optional. Absolute path to a python executable, or a program name on PATH. Mutually exclusive with conda; omit both to use the workspace interpreter.",
      "type": "string"
    },
    "conda": {
      "description": "Optional. Conda environment name; its python executable is used. Mutually exclusive with interpreter. Discover names with `conda env list` in Bash.",
      "type": "string"
    },
    "cwd": {
      "description": "Optional. Working directory; defaults to the session workspace. Must be inside the workspace or an allowed path. A relative path resolves against the session workspace.",
      "type": "string"
    },
    "timeout": {
      "description": "Foreground wait in milliseconds, 1-600000 (default 120000). With run_in_background, an optional task timeout.",
      "type": "number",
      "minimum": 1,
      "maximum": 600000
    },
    "run_in_background": {
      "description": "Return a task ID immediately; read output with TaskGet and stop it with TaskStop (default false).",
      "type": "boolean"
    },
    "description": {
      "description": "Short label for the user, such as \"Inspect session table\".",
      "type": "string"
    }
  },
  "required": ["code"],
  "additionalProperties": false
}
```

### 4.3 工具描述（模型可见）

沿用仓库英文描述风格，建议：

> Run Python code as `__main__` with the workspace interpreter. This is Python, not a shell: pipes, redirection, `$VAR`, `&&` and globs are not interpreted; use Bash for `python -m ...`, scripts with arguments, or untrusted code. The code runs from a file, so `__file__` is set and `input()` returns EOF. Set `save_name` to keep the script under the workspace `temp/` directory and return its path as `script_path`; without it the script is temporary and deleted after the call. `env` is merged over the inherited environment before the interpreter starts; `PYTHONPATH` is merged rather than replaced, and the working directory stays importable. Long jobs can use `run_in_background` and are read with `TaskGet`.

### 4.4 注册点

1. `crates/core/src/tools/mod.rs`
   - `pub mod python;`
   - `get_tool_definitions()` 中加入 `python::definition()`，位置与其它内置工具并列。
   - `execute_tool_async` 中分发：
     ```rust
     if name == "Python" {
         return python::execute(input, cwd).await;
     }
     ```
   - 同步入口 `execute_tool` 如需支持（Tauri 直接调用、测试），按 `tool_bash` 的方式加 `sync_runtime::run` 包装；后台模式在没有引擎会话时会报错，属预期。
2. 确认 `adapt_tools`（`crates/core/src/native_engine/tool_loop.rs`，`builtin_tool_catalog` 附近）不会在 Code profile 过滤掉 `Python`。
3. `prepare_tool_definitions`（`tool_loop.rs`）无需改动，`ToolLoad` 会从 catalog 中按名字取。

## 5. 参数与校验

### 5.1 校验规则

| 参数 | 规则 | 报错示例 |
| --- | --- | --- |
| `code` | 必填，非空字符串 | `Python requires code.` |
| `save_name` | 相对路径、仅 `.py`、不含 `..`；落在 `<workspace>/temp/` 内 | `Python save_name must be a relative .py path under temp/.` |
| `env` | 必须是 object，value 必须是 string | `Python env must be an object of string values.` |
| `env` key | `^[A-Za-z_][A-Za-z0-9_]*$` | `Python env key must match [A-Za-z_][A-Za-z0-9_]*: 1BAD` |
| `env` 保留名 | 不得为 `INTERNAL_ENV` 中的 6 个变量 | `Python env cannot set host-reserved variable: DEEPSEEK_CODE_BACKGROUND_TOKEN` |
| `env` 规模 | ≤ 32 个 key，key+value 总量 ≤ 16 KiB | `Python env allows at most 32 variables and 16 KiB.` |
| `interpreter` / `conda` | 至多一个 | `Pass at most one of interpreter and conda; omit both to use the workspace interpreter.` |
| `cwd` | 目录存在；解析后必须通过 `is_path_allowed` | `Python cwd is outside the allowed paths: ...` |
| `timeout` | 1–600000 毫秒；后台时为可选任务超时 | `Python timeout must be between 1 and 600000 milliseconds.` |

`INTERNAL_ENV`（`crates/core/src/services/background_sessions.rs`）：

```text
DEEPSEEK_CODE_BACKGROUND_JOB
DEEPSEEK_CODE_BACKGROUND_CONTROL
DEEPSEEK_CODE_WORKER_MODEL
DEEPSEEK_CODE_WORKER_GENERATION
DEEPSEEK_CODE_WORKER_AUTO_ROUTE
DEEPSEEK_CODE_BACKGROUND_TOKEN
```

Windows 上环境变量名大小写不敏感：`PATH` 与 `Path` 同时出现时按最后一次覆盖，不要向子进程传两份。

### 5.2 `cwd` 解析

- 相对路径按会话工作区解析（`execute_tool_async` 的 `cwd` 参数）。
- 解析后必须是已存在的目录。
- 必须通过 `crate::tools::mod::is_path_allowed`（与 Bash 恢复 cwd 时使用的同一函数）。
- 不持久化，仅本次调用生效。

### 5.3 `save_name` 解析

保存根目录固定为**工作区的 `temp/`**，与 `cwd` 参数无关（`cwd` 只影响运行时的工作目录）。例如 `script/001.py` 最终落到：

```text
<workspace>/temp/python/script/001.py
```

规则：

- 只接受相对路径；拒绝绝对路径、盘符、UNC、`RootDir`、`Prefix`。
- 只接受 `Normal` 组件；拒绝 `..`、`.`、空组件。
- 最后一段必须以 `.py` 结尾。
- 组件里拒绝 `:`（Windows 备用数据流）和 NUL；Windows 其它非法字符交给文件系统报错。
- 最多 8 层目录，完整相对路径不超过 200 字符。
- 自动创建父目录。
- 覆盖已存在的 `.py` 文件是允许的：`temp/` 是草稿目录。
- 目标已存在且是符号链接时拒绝写入，避免借 `temp/` 把内容写到别处。
- 写入前对父目录做 canonicalize，确认仍在 `<workspace>/temp` 下；创建目录后再检查一次。
- 仓库根目录的 `/temp/` 已在 `.gitignore` 中，正常不会出现在 `git status`。

### 5.4 与临时脚本的关系

- 不传 `save_name`：写系统临时目录，执行后删除（见 7.1）。仍然会落盘，只是不保留，结果 `script_saved: false`。
- 传 `save_name`：写 `<workspace>/temp/python/<save_name>`，执行后**不删除**，结果 `script_saved: true`。
- 两种模式执行的是同一个文件路径，`__file__` 都指向真实脚本。
- 必须落盘的原因：后台 `Interaction::None` 没有 stdin，代码无法通过 stdin 传入；`python -c` 又受 Windows 约 32K 命令行长度限制。文件是前后台唯一统一的方案。

## 6. 解释器解析

### 6.1 顺序

```text
1. interpreter 参数         source = "parameter"
2. conda 参数               source = "conda"
3. settings.python.path     source = "settings"        （P2，可选）
4. VIRTUAL_ENV              source = "VIRTUAL_ENV"
5. CONDA_PREFIX             source = "CONDA_PREFIX"
6. <workspace>/.venv        source = "venv"
   然后 venv、env
7. PATH：py -3（仅 Windows）→ python3 → python   source = "PATH"
```

解析结果：

```rust
struct ResolvedInterpreter {
    program: PathBuf,
    args: Vec<String>,      // py 启动器为 ["-3"]，其余为空
    source: &'static str,
}
```

### 6.2 `interpreter` 参数

- 绝对路径：必须存在且是文件；不解析命令串，值里带空格视为路径的一部分。
- 裸名：走 `lsp_servers::find_on_path`。
- basename 为 `py`/`py.exe`：追加 `-3`。
- 解析失败时报错并列出尝试过的候选，提示用 `Bash` 执行 `py -0p`、`conda env list`、`which python` 查询。

### 6.3 `conda` 参数

- 不要用 `conda run`：多一层包装进程，缓冲输出、吞信号，`TaskStop` 难以杀干净。
- 执行 `conda env list --json`，按 `envs` 路径的 basename 匹配环境名，取：
  - Windows：`<prefix>/python.exe`
  - 其它：`<prefix>/bin/python`
- 结果按 `conda` 配置文件的 mtime 缓存，避免每次调用都起进程。
- `conda` 不存在或环境名不存在时给出明确错误，不静默回退到 PATH。

### 6.4 Windows 特例

- 跳过 `WindowsApps\python.exe` / `Microsoft\WindowsApps\python.exe`（Store 占位程序）。
- 优先 `py -3`，失败再试 `python3`、`python`。

## 7. 执行管线

### 7.1 脚本落盘

```rust
let script = match save_name {
    Some(name) => {
        let root = workspace.join("temp");
        std::fs::create_dir_all(&root)?;
        let path = root.join(name);          // name 已通过组件校验
        std::fs::create_dir_all(path.parent().unwrap())?;
        path
    }
    None => std::env::temp_dir().join(format!("dcl-python-{}.py", uuid::Uuid::new_v4())),
};
std::fs::write(&script, code)?;
```

- 用文件而不是 stdin：`background_shell::start` 在 `Interaction::None` 时 stdin 为 null，后台无法塞入初始代码。
- 用文件而不是 `-c`：Windows 命令行上限约 32K，大段代码会被截断。
- 没有 `save_name` 时也会写临时文件：这是前后台统一执行路径的代价，执行后删除。
- 临时脚本放在系统临时目录，沙箱下只读可访问。
- 保存脚本放在工作区 `temp/`，沙箱下可写（若 `temp/` 在可写路径内）；沙箱开启时若不可写，写入阶段会明确报错。

### 7.2 命令构造

```rust
let mut command = Command::new(&interpreter.program);
command
    .args(&interpreter.args)          // py -3
    .args(["-X", "utf8", "-u"])
    .arg(&script)
    .current_dir(&workdir)
    .kill_on_drop(true);
#[cfg(windows)]
command.creation_flags(0x08000000);   // CREATE_NO_WINDOW
```

- `-X utf8`：统一 UTF-8 I/O，Windows 中文输出不乱码。
- `-u`：无缓冲，后台任务被杀时日志不丢。
- 不加 `-I`：它会把 cwd 从 `sys.path` 移除，项目内 `import` 会失败。

### 7.3 环境变量

应用顺序固定：

```rust
strip_internal_env(&mut command);              // 1. 清宿主私有变量
for (key, value) in env {                      // 2. 模型显式提供的
    command.env(key, value);
}
command.env("PYTHONPATH", merged_pythonpath);  // 3. 合并，不能被覆盖
```

`merged_pythonpath` 的顺序：

```text
workdir → env["PYTHONPATH"] 的条目 → 进程继承的 PYTHONPATH
```

- 工作区排第一，保证项目模块优先。
- 用 `std::env::join_paths` 生成，Windows 自动用 `;`。
- 按顺序去重；Windows 下按大小写不敏感比较。

`strip_internal_env` 只移除上面 6 个宿主身份变量，`PATH`、`HOME`、`PYTHONPATH` 等全部保留。它是 Bash、hook、MCP server、nested CLI 共用的边界（`crates/core/src/tools/mod.rs` 中 Bash 路径同样调用）。

### 7.4 前台与后台

```rust
if background {
    background_shell::start(
        command, timeout_opt, "python", &description, &display, None,
        background_shell::Interaction::None,
    )
} else {
    background_shell::run_foreground(
        command, timeout, "python", &description, &display, None,
    ).await
}
```

- `shell`/显示名传 `"python"`，结果里会得到 `"shell": "python"`，保持与 Bash 相同的结果形状。
- `display` 用脚本文件名或 `description`，不要把整段代码写进任务 metadata（日志会爆）。
- 后台要求存在引擎会话（`CONTEXT`），无会话时返回明确错误。

### 7.5 沙箱（P0，必须做对）

当前 `shell_state_input`（`crates/core/src/native_engine/tool_loop.rs`）只为 `"Bash" | "Monitor"` 注入 `__sandbox`。**必须把 `"Python"` 加进去**，否则开启沙箱时 Python 会静默地在沙箱外执行——这是安全回归，不是功能缺失。

`python.rs` 中：

```rust
if let Some(policy) = input.get("__sandbox").filter(|value| value.is_object()) {
    let (program, args) = crate::tools::sandbox::wrap(policy, interpreter_str)?;
    command = Command::new(program);
    command.args(args);           // 参数末尾已经是解释器
    // 之后照常追加 -X utf8 -u <script>
}
```

- `sandbox::wrap` 的参数末尾就是被包装的程序，因此可以直接传解释器路径。
- Linux（bwrap）与 macOS（sandbox-exec）都支持；Windows 上 `wrap` 会返回“不支持沙箱”，与 Bash 行为一致，不要偷偷降级为无沙箱执行。
- 网络使用 `network_rules` 时，`wrap` 会注入代理；`register_asker` 依据 `tool_input["__sandbox"]` 工作，无需额外改动。
- 可选：照抄 Bash 的 `sandbox::blocked_since` 逻辑，把被拦截的主机写进结果。

### 7.6 清理

- 前台：未传 `save_name` 时，调用返回后 `std::fs::remove_file(&script)`。CPython 在启动时已读完整个文件，删除安全。
- 前台：传了 `save_name` 时**不删除**，保留在工作区 `temp/` 下。
- 后台：未传 `save_name` 时无法立即删除（进程可能尚未读取）。v1 采用启动时清扫：删除临时目录下超过 24 小时的 `dcl-python-*.py`。
- 后台：传了 `save_name` 时同样保留。
- P2：把临时脚本路径写入任务 metadata，任务完成/停止时删除。

### 7.7 结果结构

复用 `bash_process` 的字段，再追加解释器与脚本状态。结果有两种形态。

传了 `save_name`：

```json
{
  "success": true,
  "exit_code": 0,
  "stdout": "hello\n",
  "stderr": "",
  "stdout_truncated": false,
  "stderr_truncated": false,
  "interpreter": "C:\\project\\.venv\\Scripts\\python.exe",
  "script_saved": true,
  "script_path": "D:\\project\\temp\\python\\script\\001.py"
}
```

没有传 `save_name`：

```json
{
  "success": true,
  "exit_code": 0,
  "stdout": "hello\n",
  "stderr": "",
  "stdout_truncated": false,
  "stderr_truncated": false,
  "interpreter": "C:\\project\\.venv\\Scripts\\python.exe",
  "script_saved": false
}
```

- `script_saved` 每次都输出：`true` 表示脚本保留在 `<workspace>/temp/<save_name>`；`false` 表示用的是系统临时文件，执行后已删除。
- 只有 `script_saved: true` 时才有 `script_path`；临时脚本执行后已删除，输出路径会误导模型。
- 不传 `save_name` 时**仍然会落盘**（临时文件），只是不保留。“保存”指持久化，不是“是否写过文件”。
- `run_foreground` 还会自动带上 `"shell": "python"`；`interpreter_source` 是可选字段。两者都不进模型预览。
- 超时时沿用现有结构：`{"error": "...", "is_error": true, "timed_out": true}`。
- 不要回显 `code` 或 `env` 的值；它们已经在工具入参里。
- 不要每次探测版本；版本放在系统提示的环境块，和 `NODE_VERSION` 并列（`crates/core/src/prompt/mod.rs`，P2）。

**模型可见的预览格式**：`command_preview` / `render_with_spans` 目前只对 `Bash`、`Read`、`Write`、`Edit`、`MultiEdit`、`ApplyPatch` 做结构化渲染，其它工具原样返回。`Python` 必须加入这个列表，并按下面的顺序渲染。

默认解析（不传 `interpreter` / `conda`）：

```text
script: D:\project\temp\python\script\001.py
stdout:
hello
```

显式指定（`interpreter: "py"` 或 `conda: "data"`）：

```text
interpreter: C:\Users\me\miniconda3\envs\data\python.exe
script: D:\project\temp\python\script\001.py
stdout:
hello
```

失败：

```text
script: D:\project\temp\python\script\001.py
Exit code: 1
stderr:
Traceback (most recent call last):
...
```

规则：

- `interpreter:` 只在“有新闻”时显示：传了 `interpreter`/`conda`，且解析结果与请求不一致。绝对路径与解析结果相同时不显示；裸名和 conda 名显示实际路径。未传时若解析结果与会话默认不同（例如会话中途新建了 `.venv`），也显示。
- 默认解析不显示解释器；默认路径与版本放在环境块，每次会话一行，和 `NODE_VERSION` 并列。
- JSON 结果仍每次包含 `interpreter` 与 `interpreter_source`，UI、记录和排查不受影响；模型也可以随时打印 `sys.executable`。
- `script:` 只在结果含 `script_path` 时显示；临时脚本不显示。
- 非零退出码显示 `Exit code: N`；0 不显示（与 Bash 一致）。
- `stdout:` / `stderr:` 只在对应内容非空时显示；两者都为空且成功时返回 `(Completed with no output)`。
- 顺序固定：解释器（若有）→ 脚本（若有）→ 状态行（`Exit code`、`Command timed out` 等）→ stdout → stderr。
- 路径按普通字符串打印，显示单反斜杠；不要用 `serde_json::to_string` 得到 `C:\\project\\...`。
- 不要显示 `interpreter_source`、`success`、`shell: python` 这些内部字段；它们留在 JSON 结果里给 UI 和排查用。
- 必须消费掉 `interpreter` 与 `script_path`，不要落进渲染器最后的 `Metadata: {...}` 兜底（`model_tool_output.rs` 的 “Preserve extensions” 分支）。

## 8. 权限与规则

### 8.1 规则族 `Python(*)`

- 规则语法沿用 `Tool(pattern)`（`crates/core/src/permissions/patterns.rs`）。
- 当前命令规则的 subject 是 `tool_input["command"]`，需要增加读取 `code` 的分支：
  ```rust
  let subject = context.tool_input["code"].as_str()
      .or_else(|| context.tool_input["command"].as_str());
  ```
- “含 `; & | $ ( )` 不匹配前缀授权”的保护对代码没有意义：`Python(*)` 实际等价于“放行任意代码”，粒度是二元的。文档必须写明这一点，不能让人误以为它能审查代码。
- 裸规则 `Python`（不带括号）表示整工具放行，沿用现有解析。

### 8.2 危险命令预检

- 在 `python.rs` 中调用 `crate::tools::is_dangerous_command`，传入**合成命令**（例如 `python <script>`），不要传 `code`。
- 合成命令永远不会命中规则，这是预期行为；它的作用是保持与 Bash 相同的结构位置。
- 不要把“接入了 danger 预检”当作代码安全审查。真正的门禁是 `Python(*)` 规则和沙箱。

### 8.3 计划模式陷阱

`crates/core/src/permissions/manager.rs` 中：

```rust
let shell = matches!(context.tool_name.as_str(), "Bash" | "PowerShell");
```

**不要把 `Python` 加进这个分支。** 该分支会读取 `tool_input["command"]`，Python 没有这个字段会得到空串，`is_dangerous_command("")` 返回 false，结果计划模式反而放行。

正确行为：`Python` 不是只读工具，计划模式默认拒绝；补一条测试钉住。

### 8.4 审批展示

Desktop 与 CLI 的审批框必须同时展示：

- `code`（等宽代码块，可滚动）；
- `env`（`KEY=value` 列表）；
- `cwd`、`interpreter`/`conda`（若提供）；
- `save_name` 与解析后的绝对路径（若提供），明确提示“将写入此文件”。

用户批准的是一个完整执行意图，不能只显示一行 “Run Python”。

`save_name` 是文件写入能力：虽然被限制在 `temp/` 内，审批时仍要显示目标路径，尤其是覆盖已有文件时。

## 10. 测试

### 10.1 单元测试（`python.rs` 内）

- 解释器解析每一层：参数、conda、`VIRTUAL_ENV`、`CONDA_PREFIX`、`.venv`、PATH。
- Windows Store 别名被跳过；`py` 自动追加 `-3`。
- `interpreter` + `conda` 同时传报错。
- `env`：非字符串、非法 key、超过 32 个、超过 16 KiB、保留变量，各自报错。
- `cwd`：不存在、越界（工作区外）被拒。
- `save_name`：绝对路径、`..`、`.`、非 `.py`、盘符、UNC、空路径、超过深度/长度，各自报错。
- `PYTHONPATH` 合并顺序与去重。

### 10.2 集成测试（`crates/core/tests/python_tool.rs`）

- `{"code":"print(1)"}` → `stdout == "1\n"`，`exit_code == 0`。
- `__file__` 有值；`input()` 立即返回空串（EOF）。
- `env` 在 `os.environ` 可见；`PYTHONPATH` 能 import 项目模块。
- 非零退出码；stderr 原样返回。
- 超时：杀进程树，`timed_out: true`，不留下子进程。
- 后台：返回 task id，`TaskGet` 能读到输出，`TaskStop` 能停止。
- 结果截断标记与 Bash 一致。
- `save_name: "python/script/001.py"`：文件存在于 `<workspace>/temp/python/script/001.py`，内容与 `code` 一致，结果含 `script_saved: true` 与绝对 `script_path`。
- `save_name` 嵌套目录自动创建；重复执行覆盖旧文件。
- 未传 `save_name`：执行后不残留 `dcl-python-*.py`，结果 `script_saved: false`，不含 `script_path`。
- 后台 + `save_name`：任务结束后文件仍保留。
- 目标为符号链接时拒绝写入（Unix）。
- 模型可见的预览包含 `Script: <path>` 行。

### 10.3 权限测试

- `Python(*)` 允许；裸 `Python` 允许。
- 计划模式拒绝 `Python`。
- `is_dangerous_command` 对 `print("rm -rf /")` 不误杀。

### 10.4 UI 测试

- Desktop：`ToolPermissionPrompt.test.tsx` 覆盖 Python 的 code/env/save_name 展示。
- CLI：`tool_view` 的审批与结果渲染快照。
- `command_preview` 的默认解析结果不含 `interpreter:` 行；显式 `interpreter`/`conda` 且解析结果不同时含该行；断言 `script:`、`stdout:` / `stderr:`、`Exit code:` 的顺序与单反斜杠路径。

### 10.5 命令

```powershell
cargo test --locked -p deepseek-code-core --lib --tests
cargo test --locked -p deepseek-code-cli
cargo check --locked -p deepseek-code-desktop --all-targets
npx tsc --noEmit
npm run test:run
git diff --check
```

按仓库约定，改动 `crates/cli` 或 `crates/core` 前先读 `docs/cli-regression-tests.md`，改动 `src/` 或 `src-tauri/` 前先读 `docs/desktop-regression-tests.md`，执行其中与改动相关的检查。

## 11. 验收标准

1. 模型调用 `Python({"code":"import sys; print(sys.version)"})` 能返回版本。
2. `env` 与 `PYTHONPATH` 生效，项目模块可 import，工作区始终在 `sys.path`。
3. `interpreter` 指向 conda 环境或 venv 时，结果回显正确路径与来源。
4. `save_name: "python/script/001.py"` 后文件落在 `<workspace>/temp/python/script/001.py`，JSON 结果含 `script_saved: true` 与 `script_path`，模型预览按 7.7 的格式显示 `script:`、`stdout:` / `stderr:` 与 `Exit code:`（仅显式覆盖解释器时多一行 `interpreter:`）；不传 `save_name` 时 `script_saved: false`、无 `script_path`，临时文件已删除。
5. 后台运行返回 task id，`TaskGet` 可读、`TaskStop` 可停。
6. 超时后没有孤儿子进程。
7. 开启沙箱（Linux/macOS）时 Python 与 Bash 一样被隔离；Windows 上与 Bash 一样明确报错，不静默放行。
8. 计划模式拒绝执行。
9. Desktop 与 CLI 审批框能看到代码、环境变量、工作目录与保存路径。
10. 现有 Bash、ToolLoad、权限与沙箱测试全部通过。

## 12. 风险与待验证

| 风险 | 处理 |
| --- | --- |
| 沙箱注入点遗漏 | `shell_state_input` 必须加入 `Python`；补一条“开启沙箱后 Python 被包装”的测试 |
| `save_name` 变成任意文件写入 | 限定 `<workspace>/temp/`、只允许 `.py`、拒绝 `..`/绝对路径/符号链接；审批显示目标路径 |
| 覆盖用户文件 | 只允许覆盖 `temp/` 下的 `.py`；该目录是草稿区，仓库根 `/temp/` 已在 `.gitignore` |
| 密钥写入 `env` | 工具入参会写入 `session.db`（`History::tool`）并发给提供方；描述明确劝阻，审批框展示真实值 |
| 临时脚本堆积 | 启动清扫 24 小时前的 `dcl-python-*.py`；`save_name` 文件由用户自行管理 |
| Windows `py`/Store 别名 | 解析器显式处理并测试 |
| 与 Bash 行为漂移 | 执行、捕获、超时、任务全部复用现有函数，不复制逻辑 |
| `command_preview` 漏改 | 加测试，否则 `interpreter` / `script_path` 会落到 `Metadata:` 兜底，且路径可能被 JSON 转义成双反斜杠 |
| 文档范围不一致 | `cli/sandbox.md` 同步更新 |
