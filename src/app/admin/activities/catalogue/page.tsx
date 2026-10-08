import type { Metadata } from "next";

import { BackLink } from "@/components/ui/back-link";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/layout";
import { saveCatalogueItem } from "@/features/activities/actions";
import { listCatalogue } from "@/features/activities/queries";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/types/database";

export const metadata: Metadata = { title: "Activity list" };

function CatalogueFields({ item }: { item?: Tables<"activities"> }) {
  return (
    <>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label="Name" name="name" required><Input name="name" defaultValue={item?.name} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" name="kind">
          <Select name="kind" defaultValue={item?.kind ?? "activity"}>
            <option value="activity">Activity</option>
            <option value="workout">Workout</option>
          </Select>
        </Field>
        <Field label="Area" name="category">
          <Select name="category" defaultValue={item?.category ?? ""}>
            <option value="">None</option>
            {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Usual minutes" name="default_duration_min">
          <Input name="default_duration_min" type="number" min={1} max={480} defaultValue={item?.default_duration_min ?? ""} />
        </Field>
      </div>
      <Field label="How to do it" name="description"><Textarea name="description" rows={2} defaultValue={item?.description ?? ""} /></Field>
    </>
  );
}

export default async function CataloguePage() {
  const items = await listCatalogue(true);
  return (
    <>
      <PageHeader title="Activity list" back={<BackLink href="/admin/activities">Daily activities</BackLink>} description="Reusable activities and workouts therapists pick from. Hide an item instead of deleting it; past records keep their name." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3">
          {items.length === 0 ? <EmptyState title="The list is empty">Add the activities your therapists use most.</EmptyState> : null}
          {items.map((item) => (
            <details key={item.id} className="rounded-xl border border-line bg-white">
              <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-2 px-4 py-2">
                <span className="font-bold">{item.name}</span>
                {item.kind === "workout" ? <Badge tone="info">Workout</Badge> : null}
                {item.category ? <span className="text-sm text-ink-400">{item.category}</span> : null}
                {!item.is_active ? <Badge tone="bad">Hidden</Badge> : null}
              </summary>
              <ActionForm action={saveCatalogueItem} className="border-t border-line p-4">
                <CatalogueFields item={item} />
                <Checkbox name="is_active" label="Show in the list" defaultChecked={item.is_active} />
                <div><SubmitButton size="sm">Save</SubmitButton></div>
              </ActionForm>
            </details>
          ))}
        </div>
        <Panel title="Add to the list">
          <ActionForm action={saveCatalogueItem} resetOnSuccess>
            <CatalogueFields />
            <div><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
