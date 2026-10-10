"use client";
import { useCallback } from "react";
import { useI18n } from "@/i18n/provider";

export function useSkillLabel() {
  const { td } = useI18n();
  return useCallback(
    (skill: string) => {
      const key = `skills.${skill}`;
      const label = td(key);
      return label === key ? skill : label;
    },
    [td],
  );
}
