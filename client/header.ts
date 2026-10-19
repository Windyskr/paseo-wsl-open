import type {
  PluginButtonBehavior,
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import { openInWindowsRpc, type OpenTarget } from "../shared/open";

export const targetLabels: Record<OpenTarget, { title: string; icon: string }> = {
  vscode: { title: "Open in VS Code (WSL)", icon: "Code" },
  explorer: { title: "Open in Explorer", icon: "FolderOpen" },
};

function menuFor(
  client: PluginClientContext,
  targets: readonly OpenTarget[],
  directory: string,
): PluginButtonBehavior {
  return {
    kind: "menu",
    items: targets.map((target) => ({
      kind: "item" as const,
      id: target,
      title: targetLabels[target].title,
      icon: targetLabels[target].icon,
      behavior: {
        kind: "action" as const,
        async onPress() {
          await client.rpc(openInWindowsRpc, { directory, target });
        },
      },
    })),
  };
}

// One header button per workspace, kept in sync with the host's workspace directory.
export function contributeHeaderButtons(
  client: PluginClientContext,
  targets: readonly OpenTarget[],
): () => void {
  const buttons = new Map<string, { directory: string; registration: PluginButtonRegistration }>();
  let disposed = false;
  let release: (() => void) | undefined;

  const upsert = (workspace: { id: string; workspaceDirectory: string }) => {
    if (disposed || !workspace.workspaceDirectory) return;
    const existing = buttons.get(workspace.id);
    if (existing?.directory === workspace.workspaceDirectory) return;
    if (existing) {
      existing.registration.update({ behavior: menuFor(client, targets, workspace.workspaceDirectory) });
      existing.directory = workspace.workspaceDirectory;
      return;
    }
    buttons.set(workspace.id, {
      directory: workspace.workspaceDirectory,
      registration: client.addHeaderButton({
        id: "wsl-open",
        workspaceId: workspace.id,
        button: {
          title: "Open in Windows",
          icon: "FolderOpen",
          behavior: menuFor(client, targets, workspace.workspaceDirectory),
        },
      }),
    });
  };
  const remove = (workspaceId: string) => {
    buttons.get(workspaceId)?.registration.remove();
    buttons.delete(workspaceId);
  };
  const removeAll = () => {
    for (const id of [...buttons.keys()]) remove(id);
  };

  void client.paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription }) => {
      if (!subscription) return;
      release = () => void subscription.release();
      if (disposed) {
        release();
        return;
      }
      subscription.subscribe({
        snapshot: ({ entries }) => {
          const live = new Set(entries.map((workspace) => workspace.id));
          for (const id of [...buttons.keys()]) if (!live.has(id)) remove(id);
          for (const workspace of entries) upsert(workspace);
        },
        update: (message) => {
          if (message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") upsert(update.workspace);
          else remove(update.id);
        },
      });
    })
    // Without a subscription there are no header buttons; Command Center items still work.
    .catch(() => {});

  return () => {
    disposed = true;
    release?.();
    removeAll();
  };
}
