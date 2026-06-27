"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { GripVertical, Phone, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserListItem } from "@/lib/user-lineage";
import {
  V2_WORK_QUEUE_STAGES,
  normalizeV2LeadStatus,
  type V2LeadStatus,
} from "@/lib/v2-lead-status";
import { getLeadLastUpdatedAt } from "@/lib/v2-task-aging";
import { updateMyBoardLeadStatus } from "../_actions/my-board";
import HandoffModal from "./HandoffModal";
import { cn } from "@/lib/utils";

export type MyBoardCard = {
  id: string;
  customerName: string;
  phone: string | null;
  diseaseName: string | null;
  consultationStatus: V2LeadStatus;
  lastUpdatedAt: string;
};

function columnIdForStatus(status: string): string {
  const stage = V2_WORK_QUEUE_STAGES.find((s) => s.status === status);
  return stage?.id ?? V2_WORK_QUEUE_STAGES[0].id;
}

function statusForColumnId(columnId: string): V2LeadStatus {
  return (
    V2_WORK_QUEUE_STAGES.find((s) => s.id === columnId)?.status ??
    V2_WORK_QUEUE_STAGES[0].status
  );
}

function KanbanCardContent({ card, dragging }: { card: MyBoardCard; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        dragging && "shadow-lg ring-2 ring-[#3182f6]/30 rotate-1",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-slate-900 truncate">{card.customerName}</p>
          {card.diseaseName && (
            <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
              <Stethoscope className="w-3 h-3 shrink-0" />
              {card.diseaseName}
            </p>
          )}
          {card.phone && (
            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <Phone className="w-3 h-3 shrink-0" />
              {card.phone}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableCard({ card }: { card: MyBoardCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <KanbanCardContent card={card} />
    </div>
  );
}

function KanbanColumn({
  columnId,
  title,
  color,
  cards,
}: {
  columnId: string;
  title: string;
  color: string;
  cards: MyBoardCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "column", columnId },
  });

  const cardIds = cards.map((c) => c.id);

  return (
    <div
      className={cn(
        "flex flex-col w-[min(100%,280px)] shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/80",
        isOver && "ring-2 ring-[#3182f6]/40 bg-sky-50/50",
      )}
    >
      <div
        className="px-3 py-2.5 border-b border-slate-200/80 rounded-t-2xl"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-700 leading-snug">{title}</h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {cards.length}
          </span>
        </div>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 min-h-[120px] space-y-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface Props {
  initialCards: MyBoardCard[];
  assignableUsers: AdminUserListItem[];
  currentUserId: string;
}

export default function MyBoardKanban({ initialCards, assignableUsers, currentUserId }: Props) {
  const [cards, setCards] = useState(initialCards);
  const [activeCard, setActiveCard] = useState<MyBoardCard | null>(null);
  const [handoff, setHandoff] = useState<{ leadId: string; customerName: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, MyBoardCard[]>();
    for (const stage of V2_WORK_QUEUE_STAGES) {
      map.set(stage.id, []);
    }
    for (const card of cards) {
      const colId = columnIdForStatus(card.consultationStatus);
      map.get(colId)?.push(card);
    }
    return map;
  }, [cards]);

  const resolveTargetColumnId = useCallback((overId: string): string | null => {
    const stage = V2_WORK_QUEUE_STAGES.find((s) => s.id === overId);
    if (stage) return stage.id;
    const overCard = cards.find((c) => c.id === overId);
    if (overCard) return columnIdForStatus(overCard.consultationStatus);
    return null;
  }, [cards]);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const targetColumnId = resolveTargetColumnId(String(over.id));
    if (!targetColumnId) return;

    const newStatus = statusForColumnId(targetColumnId);
    if (card.consultationStatus === newStatus) return;

    const prevStatus = card.consultationStatus;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, consultationStatus: newStatus } : c)),
    );

    const result = await updateMyBoardLeadStatus(cardId, newStatus);
    if (!result.success) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, consultationStatus: prevStatus } : c)),
      );
      toast.error(result.error ?? "상태 변경에 실패했습니다.");
      return;
    }

    setHandoff({ leadId: cardId, customerName: card.customerName });
    toast.success(`「${newStatus}」(으)로 이동했습니다.`);
  };

  const handleHandedOff = (leadId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== leadId));
    toast.success("담당자에게 이관되었습니다.");
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {V2_WORK_QUEUE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              columnId={stage.id}
              title={stage.status}
              color={stage.color}
              cards={cardsByColumn.get(stage.id) ?? []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCardContent card={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <HandoffModal
        open={handoff !== null}
        leadId={handoff?.leadId ?? null}
        customerName={handoff?.customerName ?? ""}
        assignableUsers={assignableUsers}
        currentUserId={currentUserId}
        onClose={() => setHandoff(null)}
        onHandedOff={handleHandedOff}
      />
    </>
  );
}

export function buildMyBoardCards(
  leads: {
    id: string;
    customer_name: string;
    phone: string | null;
    disease_name: string | null;
    consultation_status: string;
    last_updated_at?: string | null;
    created_at: string;
  }[],
): MyBoardCard[] {
  return leads.map((lead) => ({
    id: lead.id,
    customerName: lead.customer_name,
    phone: lead.phone,
    diseaseName: lead.disease_name,
    consultationStatus: normalizeV2LeadStatus(lead.consultation_status) as V2LeadStatus,
    lastUpdatedAt: getLeadLastUpdatedAt(lead),
  }));
}
