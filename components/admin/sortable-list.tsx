"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/utils";
import { DragHandle } from "./repeatable-list";

type Identifiable = { id: string };

type SortableListProps<TItem extends Identifiable> = {
  items: TItem[];
  onReorder: (input: { ids: string[] }) => Promise<ActionResult>;
  children: (item: TItem, index: number) => React.ReactNode;
  className?: string;
};

/**
 * Drag-to-reorder list backed by a server action.
 *
 * The new order is applied locally first so the row lands where it was dropped
 * without waiting for a round-trip. If the server rejects the change the list
 * snaps back to the order it came in with, rather than leaving the screen
 * disagreeing with the database.
 *
 * `KeyboardSensor` is not optional: without it, reordering is mouse-only.
 */
export function SortableList<TItem extends Identifiable>({
  items,
  onReorder,
  children,
  className,
}: SortableListProps<TItem>) {
  /**
   * Only the *order* a drag is proposing is held locally — never the rows
   * themselves.
   *
   * This list used to mirror `items` into state and re-sync only when the id
   * order changed. Renaming a row leaves the ids identical, so that guard read
   * as "nothing moved" and discarded the freshly-fetched row: the server had
   * the new title, the screen kept the old one, and only a full reload fixed
   * it.
   *
   * Deriving the rows from props on every render means server data always
   * wins, while `pendingIds` still lets a drag settle instantly instead of
   * waiting for the round-trip.
   */
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const order = useMemo(() => {
    if (!pendingIds) return items;

    const byId = new Map(items.map((item) => [item.id, item]));
    const reordered = pendingIds
      .map((id) => byId.get(id))
      .filter((item): item is TItem => item !== undefined);

    // A row was added or removed since the drag, so the pending order no
    // longer describes this list — the server's ordering is the truthful one.
    return reordered.length === items.length ? reordered : items;
  }, [items, pendingIds]);

  const sensors = useSensors(
    // A small distance threshold keeps a click on a row's buttons from being
    // interpreted as the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = order.findIndex((item) => item.id === active.id);
    const to = order.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    const nextIds = arrayMove(order, from, to).map((item) => item.id);
    setPendingIds(nextIds);

    startTransition(async () => {
      const result = await onReorder({ ids: nextIds });
      if (!result.ok) {
        // Dropping the pending order snaps the list back to whatever the
        // server last sent, which is still the truth.
        setPendingIds(null);
        toast.error(result.error);
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={order.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={cn("space-y-3", className)}>
          {order.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {children(item, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-xl border border-border bg-card",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary/30",
      )}
    >
      <DragHandle
        ref={setActivatorNodeRef}
        aria-label="Reorder"
        className="mt-3 ml-2"
        {...attributes}
        {...listeners}
      />
      <div className="min-w-0 flex-1 py-3 pr-3">{children}</div>
    </li>
  );
}
