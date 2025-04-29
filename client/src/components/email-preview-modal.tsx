import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmailPreview, ContentSafety } from "./email-preview";
import { X } from "lucide-react";

type MatchedRule = {
  id: number;
  rule_text: string;
  is_regex: boolean;
};

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: {
    subject: string;
    sender: string;
    date: string;
    contentHtml: string;
    contentText: string;
    safety: ContentSafety;
    matchedRules?: MatchedRule[];
  } | null;
  onDelete?: () => Promise<void>;
  onMarkSafe?: () => Promise<void>;
  isDeleting?: boolean;
  isMarking?: boolean;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  email,
  onDelete,
  onMarkSafe,
  isDeleting = false,
  isMarking = false,
}) => {
  if (!email) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 max-h-[90vh] overflow-auto">
        <DialogHeader className="p-6 pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle>Email Preview</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Inspect the email content and take action
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          <EmailPreview
            subject={email.subject}
            sender={email.sender}
            date={email.date}
            contentHtml={email.contentHtml}
            contentText={email.contentText}
            safety={email.safety}
            matchedRules={email.matchedRules}
          />
        </div>

        {(onDelete || onMarkSafe) && (
          <DialogFooter className="px-6 pb-6">
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Email"}
              </Button>
            )}
            {onMarkSafe && email.safety !== ContentSafety.SAFE && (
              <Button 
                variant="outline" 
                onClick={onMarkSafe}
                disabled={isMarking}
                className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
              >
                {isMarking ? "Marking as Safe..." : "Mark as Safe"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewModal;