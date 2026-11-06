# Shell 危险规则

CLI、Desktop、Worker 使用同一套规则。匹配按命令位置、参数和管道进行，忽略命令名大小写，识别可执行文件路径和 `.exe` 后缀。`grep 'shutdown'`、`cat /etc/passwd`、提交信息中的关键词不会因为普通文本触发规则。

## 当前规则

以下为完整类别；同一类别的等效空白、引号、选项顺序和常用长选项也会匹配。

- `rm` 同时包含递归和强制选项，且目标以 `/`、`~`、`.` 开头；例如 `rm -rf /`、`rm -f -r ~`、`rm --recursive --force ./build`。`rm -rf build` 不属于此规则。
- `dd` 带 `if=` 参数；名称以 `mkfs` 开头的程序；经典 `:(){ :|:& };:` fork bomb。
- 重定向目标以 `/dev/sda`、`/dev/hda`、`/dev/nvme`、`/dev/tcp/` 开头。
- `chmod` 设置 `777`，并使用递归选项或绝对路径；递归 `chown`。
- `curl` 或 `wget` 的输出通过管道交给 `bash` 或 `sh` 执行，支持 URL 和下载选项。
- `sudo su`、`sudo -i`、`passwd`。
- `format` 指向 C/D 盘；`del`、`rd`、`rmdir` 同时带 `/s`、`/q` 并指向 C/D 盘。
- `Remove-Item` 同时带 `-Recurse`、`-Force`，且目标以 `C:` 或 `/` 开头。
- `diskpart`、`bcdedit`；`net user administrator`、`net localgroup administrators`。
- `Add-MpPreference -ExclusionPath`；`Set-MpPreference` 的 `-Disable…` 选项。
- `reg delete` 指向 `HKLM\Software` 或 `HKCU\Software`；`sc stop`、`sc delete`。
- `eval`、`Invoke-Expression`、`iex`；`shutdown`；`restart -f`。
- `docker rm -f`（或 `--force`）；`docker system prune`。
- `nc`、`netcat` 的 `-e` 选项。

会检查 `&&`、`;`、换行和管道中的各个命令，检查 `$()` 和反引号中的命令替换，以及常见 Shell 的 `-c`、`/c`、`-Command` 参数。`sudo`、`env`、`command`、`exec`、`nohup`、`xargs` 和 `find -exec` 的常见命令包装也会检查。嵌套 Shell/命令替换超过 8 层会命中规则。

## 边界

这是明确的语法规则列表，**未命中不等于安全**。它不读取未知脚本内容，不分析 Python/Node 等语言代码，不解码编码命令，不展开变量、别名、Shell 函数，也不是完整的 Bash、CMD 或 PowerShell 语法分析器。用户配置的 ask/deny、Hook 和操作系统沙箱是独立检查。

Plan 模式拒绝命中的命令。Bypass 跳过此规则；完全访问还会跳过显式 deny 和沙箱。其他模式的实际审批行为见[权限模式](./permissions.md)。规则不改变命令本身的退出码或操作系统权限。
