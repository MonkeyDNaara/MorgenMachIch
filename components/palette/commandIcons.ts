import {
  Calendar,
  LayoutList,
  Plus,
  Settings,
  Sun,
  Tag,
  Terminal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/** Icon per command id — kept out of lib/commands so the registry has
 * no UI dependency (#196). Same icons as the nav rail for the pages. */
const COMMAND_ICONS: Record<string, LucideIcon> = {
  "go-today": Sun,
  "go-tasks": LayoutList,
  "go-calendar": Calendar,
  "go-labels": Tag,
  "go-stats": TrendingUp,
  "go-settings": Settings,
  "new-task": Plus,
};

export function commandIcon(id: string): LucideIcon {
  return COMMAND_ICONS[id] ?? Terminal;
}
