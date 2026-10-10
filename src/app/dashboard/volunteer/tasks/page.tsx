import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/features/volunteer/task-list";
import { getT } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("volunteer.tasksTitle") };
}

export default async function TasksPage() {
  await requireRole(["VOLUNTEER"], "/dashboard/volunteer/tasks");
  const t = await getT();
  return (
    <>
      <PageHeader title={t("volunteer.tasksTitle")} subtitle={t("volunteer.tasksSubtitle")} />
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("volunteer.tasksActive")}</TabsTrigger>
          <TabsTrigger value="completed">{t("volunteer.tasksCompleted")}</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <TaskList status="active" />
        </TabsContent>
        <TabsContent value="completed">
          <TaskList status="completed" />
        </TabsContent>
      </Tabs>
    </>
  );
}
