"use client";
import { Badge } from "@/components/ui/badge";
import { useSkillLabel } from "@/hooks/use-skill-label";

export function SkillList({ skills }: { skills: string[] }) {
  const label = useSkillLabel();
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <Badge key={s} variant="soft" className="px-3 py-1 text-sm font-medium">
          {label(s)}
        </Badge>
      ))}
    </div>
  );
}
