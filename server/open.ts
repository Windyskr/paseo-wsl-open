import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import { openTargets, type OpenTarget, type openInWindowsRpc } from "../shared/open";

const execFileAsync = promisify(execFile);

const windowsCommands: Record<OpenTarget, string> = {
  vscode: "code",
  explorer: "explorer.exe",
};

async function wslpath(flag: "-u" | "-w", path: string): Promise<string> {
  const { stdout } = await execFileAsync("wslpath", [flag, path]);
  return stdout.trim();
}

// \\wsl.localhost\Ubuntu\home\... -> Ubuntu; falls back to the daemon's environment.
function distroName(windowsPath: string): string | null {
  const match = /^\\\\wsl(?:\.localhost|\$)\\([^\\]+)/i.exec(windowsPath);
  return match?.[1] ?? process.env.WSL_DISTRO_NAME ?? null;
}

// WSL only adds the Windows PATH to login sessions, so a daemon started by systemd cannot find
// these commands on its own PATH. Asking Windows works either way and proves interop works.
// Resolves to null outside WSL, without interop, or when the command is not installed.
async function locateOnWindows(target: OpenTarget): Promise<string | null> {
  const command = windowsCommands[target];
  try {
    const cmd = await wslpath("-u", "C:\\Windows\\System32\\cmd.exe");
    const { stdout } = await execFileAsync(cmd, ["/c", `chcp 65001 >nul & where ${command}`], {
      cwd: dirname(cmd),
      timeout: 10_000,
    });
    // `where code` also lists code.cmd; the extensionless script is the WSL-aware launcher.
    const match = stdout
      .split(/\r?\n/)
      .find((line) => line.toLowerCase().endsWith(`\\${command}`));
    return match ? await wslpath("-u", match) : null;
  } catch {
    return null;
  }
}

export async function availableTargets(): Promise<OpenTarget[]> {
  const located = await Promise.all(openTargets.map(locateOnWindows));
  return openTargets.filter((_, index) => located[index] !== null);
}

// Windows GUI launchers block or return odd exit codes (explorer.exe exits 1 on success),
// so detach and only report spawn failures.
function launch(command: string, args: string[], env = process.env): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      cwd: dirname(command),
      env,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function openInWindows({
  directory,
  target,
}: RpcInput<typeof openInWindowsRpc>): Promise<RpcOutput<typeof openInWindowsRpc>> {
  if (!isAbsolute(directory) || !(await stat(directory)).isDirectory()) {
    throw new Error(`Not a directory: ${directory}`);
  }
  const windowsPath = await wslpath("-w", directory);
  const command = await locateOnWindows(target);
  if (!command) throw new Error(`Cannot find ${windowsCommands[target]} on Windows`);

  if (target === "explorer") {
    await launch(command, [windowsPath]);
    return { windowsPath };
  }

  const distro = distroName(windowsPath);
  if (!distro) throw new Error("Cannot determine the WSL distro name");
  // VS Code's launcher script only takes its WSL path when this variable is set,
  // and a daemon started by systemd does not have it.
  await launch(command, ["--remote", `wsl+${distro}`, directory], {
    ...process.env,
    WSL_DISTRO_NAME: distro,
  });
  return { windowsPath };
}
