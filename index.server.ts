import type { PluginServerContext } from "@getpaseo/plugin/server";
import { availableTargets, openInWindows } from "./server/open";
import { openInWindowsRpc, probeRpc } from "./shared/open";

export default function contribute(server: PluginServerContext) {
  server.handle(probeRpc, async () => ({ targets: await availableTargets() }));
  server.handle(openInWindowsRpc, openInWindows);
  return () => {};
}
