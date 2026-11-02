import type { PluginServerContext } from "@getpaseo/plugin/server";
import { availableTargets, openInWindows } from "./server/open";
import { openInWindowsRpc, probeRpc } from "./shared/open";

export default function contribute(server: PluginServerContext) {
  server.handle(probeRpc, async () => {
    const targets = await availableTargets();
    console.log(`[wsl-open] launchable targets: ${targets.join(", ") || "none"}`);
    return { targets };
  });
  server.handle(openInWindowsRpc, openInWindows);
  return () => {};
}
