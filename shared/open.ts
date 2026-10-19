import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const openTargets = ["vscode", "explorer"] as const;
export type OpenTarget = (typeof openTargets)[number];

export const probeRpc = defineRpc({
  name: "wsl-open.probe",
  input: z.object({}),
  // Targets the daemon can actually launch; empty outside WSL.
  output: z.object({ targets: z.array(z.enum(openTargets)) }),
});

export const openInWindowsRpc = defineRpc({
  name: "wsl-open.open",
  input: z.object({ directory: z.string().min(1), target: z.enum(openTargets) }),
  output: z.object({ windowsPath: z.string() }),
});
