import { toast } from "sonner";

export async function copyV2ShareLink(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function requireAgentId(agentId: string, message: string): boolean {
  if (agentId) return true;
  toast.error(message);
  return false;
}
