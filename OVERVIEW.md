# Open in Windows (WSL)

Opens a workspace from a Paseo daemon running inside WSL in Windows apps. An "Open in Windows" menu in the workspace header offers these actions, also available from the Command Center:

- **Open in VS Code (WSL)** opens the workspace directory in VS Code through the WSL extension.
- **Open in Zed (WSL)** opens the workspace directory in Zed through its WSL remote support.
- **Open in Explorer** opens the directory in Windows Explorer at its `\\wsl.localhost` path.

Paseo Desktop only shows its built-in open-in-editor button for its own bundled daemon, so workspaces on a daemon in WSL have no such button. This plugin launches the apps from the daemon through WSL interop instead.

## When the menu appears

The menu only appears in Paseo Desktop on Windows. Mobile, browser, macOS and Linux clients show nothing. Each action appears only when the daemon confirms it can launch it: the daemon must run in WSL with working Windows interop, and Windows must find `code`, `zed.exe` or `explorer.exe` on its own `PATH`. This also works when the daemon is started by systemd.

## Setup

- A Paseo daemon running inside WSL 2, with Windows interop enabled (the WSL default).
- VS Code with the WSL extension installed on Windows, for the VS Code action.
- Zed installed on Windows, for the Zed action.

## Limits

Apps open on the Windows machine that hosts the daemon. The plugin reports whether the launcher process started, not whether the app window opened. It makes no network requests and does not read or write files beyond checking the workspace directory exists.
