import { execFile, spawn } from "node:child_process";
import { access, constants, readFile, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { OpenTarget, openInWindowsRpc } from "../shared/open";

const execFileAsync = promisify(execFile);

async function toWindowsPath(directory: string): Promise<string> {
  const { stdout } = await execFileAsync("wslpath", ["-w", directory]);
  return stdout.trim();
}

// \\wsl.localhost\Ubuntu\home\... -> Ubuntu; falls back to the daemon's environment.
function distroName(windowsPath: string): string | null {
  const match = /^\\\\wsl(?:\.localhost|\$)\\([^\\]+)/i.exec(windowsPath);
  return match?.[1] ?? process.env.WSL_DISTRO_NAME ?? null;
}

async function onPath(command: string): Promise<boolean> {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    try {
      await access(join(dir, command), constants.X_OK);
      return true;
    } catch {}
  }
  return false;
}

async function isWsl(): Promise<boolean> {
  if (!process.env.WSL_INTEROP && !process.env.WSL_DISTRO_NAME) {
    const version = await readFile("/proc/version", "utf8").catch(() => "");
    if (!/microsoft/i.test(version)) return false;
  }
  return onPath("wslpath");
}

export async function availableTargets(): Promise<OpenTarget[]> {
  if (!(await isWsl())) return [];
  try {
    // Proves Windows interop works, not just that the binaries exist.
    if (!distroName(await toWindowsPath("/"))) return [];
  } catch {
    return [];
  }
  const targets: OpenTarget[] = [];
  if (await onPath("code")) targets.push("vscode");
  if (await onPath("explorer.exe")) targets.push("explorer");
  return targets;
}

// Windows GUI launchers block or return odd exit codes (explorer.exe exits 1 on success),
// so detach and only report spawn failures.
function launch(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", cwd: "/mnt/c" });
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
  const windowsPath = await toWindowsPath(directory);

  if (target === "explorer") {
    await launch("explorer.exe", [windowsPath]);
    return { windowsPath };
  }

  const distro = distroName(windowsPath);
  if (!distro) throw new Error("Cannot determine the WSL distro name");
  await launch("code", ["--remote", `wsl+${distro}`, directory]);
  return { windowsPath };
}
