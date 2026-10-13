"use client";

import { useId, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Label, Task } from "@/lib/types";
import TaskCard from "@/components/task/TaskCard";
import DragHandle from "@/components/dnd/DragHandle";
import MoveMenu from "@/components/dnd/MoveMenu";
import { useToast } from "@/components/layout/ToastProvider";
import { useAppSensors } from "@/lib/ui/dnd/useAppSensors";
import { createListAnnouncements } from "@/lib/ui/dnd/announcements";
import { REDUCED_MOTION, useMediaQuery } from "@/lib/ui/useMediaQuery";
import { LIST_DRAG_INSTRUCTIONS } from "@/lib/utils/dndAnnouncements";
import {
  applyOrder,
  moveId,
  moveTargetIndex,
  neighboursOf,
  sameOrder,
  type MoveAction,
} from "@/lib/utils/listMove";

type SortableTaskCardListProps = {
  /** Already filtered and sorted; the order shown is the order saved. */
  tasks: Task[];
  labels: Label[];
  showAge?: boolean;
  showPlan?: boolean;
  /** Saves a move: the task now sits between `prevId` and `nextId`
   * (its visible neighbours, null at the ends). */
  onReorder: (id: string, prevId: string | null, nextId: string | null) => Promise<void>;
};

/** A click on the grip this soon after a drop is the drop's own mouseup,
 * not a request for the menu. */
const CLICK_AFTER_DROP_MS = 200;

/**
 * Hand-ordered task cards (#73, the Backlog): drag a card by its grip,
 * use the keyboard (Space/Enter on the grip, arrows, Space/Enter, Escape)
 * or click the grip for the move menu — all three end in `move()`, so
 * they produce the same order.
 *
 * Variant A from the mockup: the lifted card follows the pointer in a
 * `DragOverlay` with `drag-lifted` (tilt + accent ring), and the list
 * opens a `drop-slot` where it will land. With reduced motion there is
 * no slide and no drop animation.
 *
 * After a move the new order is kept in `pending` and shown right away,
 * until the live query delivers the same order (no jump back while the
 * write is in flight). A failed save drops it and says so in a toast.
 */
export default function SortableTaskCardList({
  tasks,
  labels,
  showAge = false,
  showPlan = false,
  onReorder,
}: SortableTaskCardListProps) {
  const dndId = useId();
  const { notify } = useToast();
  const sensors = useAppSensors({ coordinateGetter: sortableKeyboardCoordinates });
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<string[] | null>(null);
  const justDropped = useRef(false);

  const propIds = tasks.map((task) => task.id);
  // Stop overriding the live order once it has caught up — or once the
  // list itself changed (a filter, a task planned away), where the pending
  // order no longer applies.
  if (pending && (sameOrder(pending, propIds) || !sameMembers(pending, propIds))) {
    setPending(null);
  }
  const shown = pending ? applyOrder(tasks, pending) : tasks;
  const ids = shown.map((task) => task.id);
  const titleOf = (id: string | number) => shown.find((task) => task.id === id)?.title ?? "task";
  const activeTask = shown.find((task) => task.id === activeId) ?? null;

  function move(newIds: string[], id: string) {
    if (sameOrder(newIds, ids)) return;
    const { prevId, nextId } = neighboursOf(newIds, id);
    setPending(newIds);
    onReorder(id, prevId, nextId).catch((error: unknown) => {
      console.error("Saving the new order failed", error);
      setPending(null);
      notify("Couldn't save the new order.");
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    justDropped.current = true;
    setTimeout(() => (justDropped.current = false), CLICK_AFTER_DROP_MS);
    if (!over) return;
    move(moveId(ids, String(active.id), ids.indexOf(String(over.id))), String(active.id));
  }

  function handleMenuMove(id: string, action: MoveAction) {
    const target = moveTargetIndex(ids, id, action);
    if (target !== null) move(moveId(ids, id, target), id);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements: createListAnnouncements(titleOf),
        screenReaderInstructions: { draggable: LIST_DRAG_INSTRUCTIONS },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {shown.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              labels={labels}
              showAge={showAge}
              showPlan={showPlan}
              reducedMotion={reducedMotion}
              canMove={(action) => moveTargetIndex(ids, task.id, action) !== null}
              onMove={(action) => handleMenuMove(task.id, action)}
              menuAllowed={() => !justDropped.current}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeTask && (
          <div className="drag-lifted rounded-box">
            <TaskCard
              task={activeTask}
              labels={labels}
              showAge={showAge}
              showPlan={showPlan}
              dragHandle={<DragHandle title={activeTask.title} active />}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function sameMembers(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

type SortableTaskCardProps = {
  task: Task;
  labels: Label[];
  showAge: boolean;
  showPlan: boolean;
  reducedMotion: boolean;
  canMove: (action: MoveAction) => boolean;
  onMove: (action: MoveAction) => void;
  menuAllowed: () => boolean;
};

function SortableTaskCard({
  task,
  labels,
  showAge,
  showPlan,
  reducedMotion,
  canMove,
  onMove,
  menuAllowed,
}: SortableTaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, transition: reducedMotion ? null : undefined });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // While lifted, the card's place becomes the sunken slot it will drop into.
      className={`relative ${isDragging ? "drop-slot [&>*]:invisible" : ""}`}
    >
      <TaskCard
        task={task}
        labels={labels}
        showAge={showAge}
        showPlan={showPlan}
        dragHandle={
          <DragHandle
            title={task.title}
            handleRef={(node) => {
              setActivatorNodeRef(node);
              handleRef.current = node;
            }}
            dragProps={{ ...attributes, ...listeners }}
            active={menuOpen}
            menuExpanded={menuOpen}
            onClick={(event) => {
              // Keyboard "clicks" (detail 0) belong to the keyboard drag.
              if (event.detail === 0 || !menuAllowed()) return;
              setMenuOpen((open) => !open);
            }}
          />
        }
      />
      <MoveMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onMove={onMove}
        canMove={canMove}
        anchorRef={handleRef}
        title={task.title}
      />
    </div>
  );
}
