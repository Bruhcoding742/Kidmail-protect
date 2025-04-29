import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  User,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export enum ContentSafety {
  SAFE = "safe",
  WARNING = "warning",
  UNSAFE = "unsafe",
  UNKNOWN = "unknown"
}

type MatchedRule = {
  id: number;
  rule_text: string;
  is_regex: boolean;
};

interface EmailPreviewProps {
  subject: string;
  sender: string;
  date: string;
  contentHtml: string;
  contentText: string;
  safety: ContentSafety;
  matchedRules?: MatchedRule[];
  previewOnly?: boolean;
  onClose?: () => void;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  subject,
  sender,
  date,
  contentHtml,
  contentText,
  safety,
  matchedRules = [],
  previewOnly = false,
  onClose
}) => {
  const [showContent, setShowContent] = useState(!previewOnly);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getSafetyBadge = () => {
    switch (safety) {
      case ContentSafety.SAFE:
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <ShieldCheck className="w-4 h-4 mr-1" /> Safe
          </Badge>
        );
      case ContentSafety.WARNING:
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <AlertTriangle className="w-4 h-4 mr-1" /> Warning
          </Badge>
        );
      case ContentSafety.UNSAFE:
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <ShieldAlert className="w-4 h-4 mr-1" /> Unsafe
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600">
            <AlertTriangle className="w-4 h-4 mr-1" /> Unknown
          </Badge>
        );
    }
  };

  const getSafetyAnimationColor = () => {
    switch (safety) {
      case ContentSafety.SAFE:
        return "#10b981"; // green-500
      case ContentSafety.WARNING:
        return "#f59e0b"; // amber-500
      case ContentSafety.UNSAFE:
        return "#ef4444"; // red-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const getSafetyIcon = () => {
    switch (safety) {
      case ContentSafety.SAFE:
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case ContentSafety.WARNING:
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case ContentSafety.UNSAFE:
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden">
      <CardHeader className="relative pb-2">
        {isAnimating && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded-t-lg"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0, -10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
            >
              {getSafetyIcon()}
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-t-lg"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              style={{
                background: `radial-gradient(circle, ${getSafetyAnimationColor()} 0%, rgba(0,0,0,0) 70%)`,
              }}
            />
          </motion.div>
        )}
        
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold mb-1">{subject}</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>{sender}</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Calendar className="w-4 h-4" />
                <span>{date}</span>
              </div>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getSafetyBadge()}
            {!previewOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContent(!showContent)}
                className="p-0 h-8 w-8"
              >
                {showContent ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        <AnimatePresence>
          {(showContent || previewOnly) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {contentHtml ? (
                <div 
                  className={cn(
                    "prose prose-sm max-w-none",
                    safety === ContentSafety.UNSAFE && "prose-headings:text-red-500",
                    safety === ContentSafety.WARNING && "prose-headings:text-amber-500"
                  )}
                  dangerouslySetInnerHTML={{ __html: contentHtml }} 
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{contentText}</pre>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!showContent && !previewOnly && (
          <div className="py-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowContent(true)}
              className="gap-2"
            >
              <Eye size={16} />
              Show Content
            </Button>
          </div>
        )}
      </CardContent>
      
      {matchedRules && matchedRules.length > 0 && (
        <>
          <Separator />
          <CardFooter className="flex-col items-start pt-4">
            <h4 className="text-sm font-medium mb-2">Matched Filter Rules:</h4>
            <div className="flex flex-wrap gap-2">
              {matchedRules.map((rule) => (
                <Badge 
                  key={rule.id} 
                  variant="outline" 
                  className="bg-red-100 text-red-800 border-red-200"
                >
                  {rule.is_regex ? "Regex: " : ""}{rule.rule_text}
                </Badge>
              ))}
            </div>
          </CardFooter>
        </>
      )}
      
      {onClose && (
        <CardFooter className="pt-2 pb-4 flex justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
        </CardFooter>
      )}
    </Card>
  );
};

export const EmailPreviewList: React.FC<{
  emails: Array<Omit<EmailPreviewProps, 'onClose' | 'previewOnly'>>;
  onSelectEmail: (index: number) => void;
}> = ({ emails, onSelectEmail }) => {
  return (
    <div className="space-y-4">
      {emails.map((email, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onSelectEmail(index)}
          className="cursor-pointer"
        >
          <Card className={cn(
            "border-l-4",
            email.safety === ContentSafety.SAFE && "border-l-green-500",
            email.safety === ContentSafety.WARNING && "border-l-amber-500",
            email.safety === ContentSafety.UNSAFE && "border-l-red-500",
            email.safety === ContentSafety.UNKNOWN && "border-l-gray-500",
          )}>
            <CardHeader className="py-3">
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-base">{email.subject}</CardTitle>
                  <CardDescription className="text-xs">
                    From: {email.sender} • {email.date}
                  </CardDescription>
                </div>
                <div>{getSafetyIcon(email.safety)}</div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      ))}
      
      {emails.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No emails to display</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
  
  function getSafetyIcon(safety: ContentSafety) {
    switch (safety) {
      case ContentSafety.SAFE:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case ContentSafety.WARNING:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case ContentSafety.UNSAFE:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  }
};

export default EmailPreview;