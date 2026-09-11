import {
  BookOpen,
  Briefcase,
  FolderGit2,
  Mail,
  Sparkles,
  Star,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { SourceKind } from "@/lib/assistant/protocol";

/** One icon per kind of source, shared by the chat and the admin preview. */
export const SOURCE_ICONS: Record<SourceKind, LucideIcon> = {
  profile: UserRound,
  about: BookOpen,
  service: Sparkles,
  skills: Wrench,
  experience: Briefcase,
  project: FolderGit2,
  highlight: Star,
  contact: Mail,
};
