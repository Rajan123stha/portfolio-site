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
import { ChevronDown, ChevronUp } from "lucide-react";
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
 * without waiting for a round-trip. If the server rejects the change — or the
 * request never comes back at all — the list snaps back to the order it came
 * in with, rather than leaving the screen disagreeing with the database or,
 * worse, taking the whole page down with it.
 *
 * Every row also carries plain up/down buttons next to the grip handle. Drag
 * needs a pointer and a steady hand; two buttons need neither, work from the
 * keyboard without discovering `Tab` into the row first, and go through the
 * exact same commit path, so they can't drift out of sync with what dragging
 * does.
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
  const [isPending, startTransition] = useTransition();

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

  /**
   * Applies a proposed order optimistically, then asks the server to persist
   * it.
   *
   * `onReorder` is a server action, and a server action that throws — a
   * dropped connection, a slow database timing out, anything the action
   * itself didn't turn into `{ ok: false }` — rejects the promise instead of
   * resolving it. Previously that rejection had nowhere to go: it surfaced as
   * an uncaught error with no error boundary anywhere in the app to catch it,
   * which is what took the whole page down instead of just failing the one
   * reorder. Catching it here means the worst case is now "the list snaps
   * back and you see a toast," the same outcome as a save the server
   * explicitly rejected.
   */
  const commit = (nextIds: string[]) => {
    setPendingIds(nextIds);

    startTransition(async () => {
      try {
        const result = await onReorder({ ids: nextIds });
        if (!result.ok) {
          // Dropping the pending order snaps the list back to whatever the
          // server last sent, which is still the truth.
          setPendingIds(null);
          toast.error(result.error);
        }
      } catch {
        setPendingIds(null);
        toast.error("Couldn't save the new order — please try again.");
      }
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = order.findIndex((item) => item.id === active.id);
    const to = order.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    commit(arrayMove(order, from, to).map((item) => item.id));
  };

  const moveBy = (index: number, delta: 1 | -1) => {
    const to = index + delta;
    if (to < 0 || to >= order.length) return;
    commit(arrayMove(order, index, to).map((item) => item.id));
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
            <SortableRow
              key={item.id}
              id={item.id}
              label={`item ${index + 1} of ${order.length}`}
              canMoveUp={index > 0}
              canMoveDown={index < order.length - 1}
              onMoveUp={() => moveBy(index, -1)}
              onMoveDown={() => moveBy(index, 1)}
              disabled={isPending}
            >
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
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  disabled,
  children,
}: {
  id: string;
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled: boolean;
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
        "flex items-start gap-1 rounded-xl border border-border bg-card",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary/30",
      )}
    >
      <div className="mt-2 ml-1 flex flex-col items-center gap-0.5">
        <DragHandle
          ref={setActivatorNodeRef}
          aria-label={`Drag to reorder — ${label}`}
          {...attributes}
          {...listeners}
        />
        <div className="flex flex-col">
          <MoveButton
            direction="up"
            label={label}
            disabled={disabled || !canMoveUp}
            onClick={onMoveUp}
          />
          <MoveButton
            direction="down"
            label={label}
            disabled={disabled || !canMoveDown}
            onClick={onMoveDown}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3">{children}</div>
    </li>
  );
}

/**
 * Plain move-up / move-down buttons, next to the drag handle on every row.
 *
 * Not a fallback shown only when dragging misbehaves — drag can fail for
 * reasons that have nothing to do with whether the click worked (a shaky
 * trackpad, a browser that mis-fires pointer events, the network blip this
 * file now recovers from) — so a control that never depends on a drag
 * gesture succeeding is worth having on screen all the time, not just when
 * something else already went wrong.
 */
function MoveButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Move ${direction} — ${label}`}
      className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
    </button>
  );
}
