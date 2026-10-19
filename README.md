# Open in Windows (WSL)

A [Paseo](https://paseo.sh) plugin for a Paseo daemon running inside WSL with Paseo Desktop on Windows.

Paseo Desktop only shows its built-in "open in editor" button for its own bundled daemon. A daemon you run inside WSL is treated as remote, and its Linux paths cannot be opened by Windows apps anyway. This plugin adds an **Open in Windows** menu to the workspace header with:

- **Open in VS Code (WSL)**: runs `code --remote wsl+<distro> <dir>`
- **Open in Explorer**: runs `explorer.exe` on the `\\wsl.localhost\<distro>\...` path from `wslpath -w`

The same actions are in the Command Center (Ctrl+K).

## When the button appears

- The client is Paseo Desktop on Windows. Mobile, browser, and macOS/Linux clients show nothing.
- The daemon reports it runs in WSL with working Windows interop (`wslpath` resolves a Windows path).
- Each action appears only if its launcher (`code` or `explorer.exe`) is on the daemon's `PATH`.

## Install

```bash
paseo plugin add git:Windyskr/paseo-wsl-open
```

Run this inside WSL against the WSL daemon, with plugins enabled on that daemon.

## Requirements

- Paseo 0.11.4 or later
- WSL 2 with Windows interop enabled (the default)
- VS Code with the WSL extension, for the VS Code action

## License

MIT
