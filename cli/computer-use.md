# 桌面操作 computer_use

`computer_use` 是模型调用的内置桌面工具，可以移动鼠标、点击、输入文字、按键、滚动、等待和截图。它操作当前桌面与焦点窗口；下面的 JSON 是工具调用参数，不是终端命令。

## 支持的操作

每次调用执行一个动作，`action_type` 必填，名称区分大小写。

| action_type | 功能 | 参数与默认值 |
|---|---|---|
| `MouseMove` | 移动鼠标 | `coordinate: {"x": 100, "y": 200}`，屏幕像素坐标 |
| `MouseClick` | 单击 | 可选 `coordinate`：先移动再点击；省略则点击当前位置。`button` 默认 `Left` |
| `MouseDown` | 按住鼠标按钮 | `button` 默认 `Left`，作用于当前位置；先用 `MouseMove` 定位 |
| `MouseUp` | 松开鼠标按钮 | `button` 默认 `Left` |
| `MouseScroll` | 滚动 | `scroll_y` 正数向下、负数向上；`scroll_x` 正数向右、负数向左。单位由系统输入后端解释，不是截图像素 |
| `KeyPress` | 按下并释放一个键 | `key`，例如 `Enter`、`Tab`、`Escape`、`a`、`F1` |
| `KeyDown` | 按住一个键 | `key`，例如 `Control`、`Shift` |
| `KeyUp` | 松开一个键 | `key` |
| `TypeText` | 输入文字 | `text`；输入到当前获得焦点的控件 |
| `Screenshot` | 截取屏幕并保存文件 | 无额外参数，返回本地绝对路径 |
| `Wait` | 等待 | `duration_ms`，毫秒；默认 1000 |

鼠标按钮名称为 `Left`、`Right`、`Middle`、`Back`、`Forward`，实际支持情况取决于平台后端。键名支持常用方向键、编辑键、F1–F12、修饰键等；未知键名不应当作有效按键使用。

`Ctrl+C` 这样的组合字符串不是单键名。组合键需要分别按下修饰键、按目标键、松开修饰键。工具每次调用都会创建本地操作管理器，跨调用保持按键或鼠标按下状态的组合操作尚未做完整验收，不应依赖它完成复杂拖拽或快捷键。

## 调用示例

截图：

```json
{"action_type":"Screenshot"}
```

点击目标后输入文字，再按回车（依次调用）：

```json
{"action_type":"MouseClick","coordinate":{"x":400,"y":300},"button":"Left"}
```

```json
{"action_type":"TypeText","text":"你好，DeepSeek Code"}
```

```json
{"action_type":"KeyPress","key":"Enter"}
```

等待界面更新：

```json
{"action_type":"Wait","duration_ms":500}
```

## 截图保存位置与返回值

新版工具将截图保存到数据目录的 `screenshots` 子目录，默认是 `~/.deepseek-code/screenshots/`。指定 `DEEPSEEK_CODE_DATA_DIR` 或通过 CLI `--data-dir` 使用其他数据目录时，截图随数据目录保存。每张图片使用唯一文件名，不覆盖旧截图。

Windows 本地截图为主显示器的 JPEG。返回示例：

```json
{
  "action":"Screenshot",
  "success":true,
  "screenshot_path":"C:/Users/Alice/.deepseek-code/screenshots/screenshot-<uuid>.jpg",
  "mime_type":"image/jpeg",
  "error":null,
  "duration_ms":0
}
```

- `screenshot_path` 是已保存文件的绝对路径；没有截图时为 `null`。
- `mime_type` 表示图片格式；没有截图时为 `null`。
- 工具结果不再包含旧版 `screenshot` Base64 字段。已有脚本应改为读取 `screenshot_path`。
- Windows 当前实现会在成功动作后附带截图，因此点击、输入或等待的结果也可能返回截图路径。
- `duration_ms` 是动作执行计时，不包含后续截图与文件保存耗时，截图动作可能显示为 0。
- 截图为空、解码失败或无法写入文件时，工具返回错误，不会给出虚假的成功路径。

可直接用图片查看器打开文件。让模型看图，需要通过 `Read` 等图片读取工具将文件作为图片交给支持视觉的模型，并满足文件访问权限。仅返回路径不会让纯文本模型获得视觉能力；纯文本模型可借助另行提供的 OCR 工具读取文字。

截图会保留在磁盘中，目前没有自动清理策略，可按需手动删除。

## 当前限制

- 这个内置工具使用本机桌面后端，没有用于选择远程桌面、Sidecar 或浏览器后端的参数。
- Windows 本地截图依赖 PowerShell 和可访问的交互桌面，当前只截取主显示器；不支持指定窗口、裁剪区域或选择显示器。
- 非 Windows 平台的本地截图尚不支持。鼠标和键盘能力也受桌面环境与系统权限影响，不能据此认为所有平台均已验收。
- 没有内置 OCR、控件树、窗口查找、网页 DOM 查询或浏览器标签页管理接口，也没有独立的双击、拖拽动作。
- Windows 部分输入操作失败时，现有实现只记录警告并继续，因此 `success: true` 不能单独证明目标控件已收到输入。应结合截图或目标应用状态验证。

工具审批规则见[权限模式与工具审批](./permissions.md)，其他工具见[内置工具](./tools.md)。
