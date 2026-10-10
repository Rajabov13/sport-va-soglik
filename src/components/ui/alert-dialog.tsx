"use client";
import * as React from "react";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<unknown>;
  children?: React.ReactNode;
}

/** Accessible confirmation dialog for irreversible or important actions. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel, destructive, loading, onConfirm, children }: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <AlertPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 grid w-full gap-4 rounded-t-3xl border bg-card p-5 pb-safe shadow-lift data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
          )}
        >
          <AlertPrimitive.Title className="text-lg font-semibold">{title}</AlertPrimitive.Title>
          {description && <AlertPrimitive.Description className="text-sm text-muted-foreground">{description}</AlertPrimitive.Description>}
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              loading={loading}
              onClick={async () => {
                await onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
