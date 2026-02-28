"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MessageHistory } from "@/components/leads/message-history";

interface MessageHistoryModalProps {
    leadId: string | null;
    leadName: string;
    open: boolean;
    onClose: () => void;
}

export function MessageHistoryModal({
    leadId,
    leadName,
    open,
    onClose,
}: MessageHistoryModalProps) {
    if (!leadId) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg">
                        Histórico — {leadName}
                    </DialogTitle>
                    <DialogDescription>
                        Mensagens trocadas com este contato.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto">
                    <MessageHistory leadId={leadId} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
