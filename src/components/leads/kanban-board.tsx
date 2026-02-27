"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { Lead } from "@prisma/client";
import { LeadTag } from "@/types"; // Ensure you have this type or import from prisma client
import { createPortal } from "react-dom";
import { updateLeadTag } from "@/actions/leads";
import { toast } from "sonner";

// Enum mapping for colors and titles
const COLUMNS: { id: LeadTag; title: string; color: string }[] = [
  { id: "NEW", title: "Novo", color: "bg-blue-500" },
  { id: "QUALIFICATION", title: "Qualificação", color: "bg-indigo-500" },
  { id: "PROSPECTING", title: "Prospecção", color: "bg-purple-500" },
  { id: "CALL", title: "Ligação", color: "bg-yellow-500" },
  { id: "MEETING", title: "Reunião Agendada", color: "bg-orange-500" },
  { id: "RETURN", title: "Retorno", color: "bg-teal-500" },
  { id: "CUSTOMER", title: "Cliente", color: "bg-green-500" },
  { id: "LOST", title: "Perdido", color: "bg-red-500" },
];

interface KanbanBoardProps {
  initialLeads: Lead[];
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.7",
      },
    },
  }),
};

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Avoid accidental drags
      },
    })
  );

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Lead") {
      setActiveLead(event.active.data.current.lead);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLead = leads.find((l) => l.id === activeId);
    if (!activeLead) return;

    // Check if dropped over a column
    const isOverColumn = COLUMNS.some((col) => col.id === overId);

    // If over a column, new tag is the column id
    // If over a card, find that card's tag
    let newTag: LeadTag | undefined;

    if (isOverColumn) {
      newTag = overId as LeadTag;
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        newTag = overLead.tag as LeadTag;
      }
    }

    if (newTag && newTag !== activeLead.tag) {
      // Optimistic Update
      setLeads((prev) =>
        prev.map((l) => (l.id === activeId ? { ...l, tag: newTag! } : l))
      );

      // Server Action
      try {
        await updateLeadTag(activeId, newTag);
        toast.success(`Lead movido para ${COLUMNS.find(c => c.id === newTag)?.title}`);
      } catch (error) {
        toast.error("Erro ao atualizar tag");
        // Revert on error
        setLeads(initialLeads);
      }
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveTask = active.data.current?.type === "Lead";
    const isOverTask = over.data.current?.type === "Lead";

    if (!isActiveTask) return;

    // Implements logic for drag over logic if needed for sorting within columns
    // For now, we rely on optimistic update in onDragEnd for column changes
    // But visual feedback during drag is handled by dnd-kit auto-scrolling and placeholders
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            leads={leads.filter((l) => l.tag === col.id)}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead && <KanbanCard lead={activeLead} />}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
