import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeHeaderButtons, targetLabels } from "./client/header";
import { isWindowsDesktopApp } from "./client/web";
import { openInWindowsRpc, probeRpc, type OpenTarget } from "./shared/open";

// The windows open on the daemon's Windows host, so only offer them in the Windows
// desktop app, and only for targets the daemon can launch.
async function launchableTargets(client: PluginClientContext): Promise<OpenTarget[]> {
  if (!isWindowsDesktopApp()) return [];
  return (await client.rpc(probeRpc, {})).targets;
}

function contributeTargets(client: PluginClientContext, targets: OpenTarget[]): () => void {
  const removers = [contributeHeaderButtons(client, targets)];
  for (const target of targets) {
    removers.push(
      client.addCommandCenterItem({
        id: `open-${target}`,
        title: targetLabels[target].title,
        icon: targetLabels[target].icon,
        keywords: ["wsl", "windows", "folder", "editor"],
        context: "workspace",
        async onSelect({ rpc, workspace }) {
          await rpc(openInWindowsRpc, { directory: workspace.directory, target });
        },
      }),
    );
  }
  return () => {
    for (const remove of removers) remove();
  };
}

export default function contribute(client: PluginClientContext) {
  let disposed = false;
  let remove: (() => void) | undefined;
  void launchableTargets(client)
    .then((targets) => {
      if (disposed || targets.length === 0) return;
      remove = contributeTargets(client, targets);
    })
    // Probe failures mean the actions cannot work here; show nothing.
    .catch(() => {});
  return () => {
    disposed = true;
    remove?.();
  };
}
