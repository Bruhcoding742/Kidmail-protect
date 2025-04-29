import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailPreview, EmailPreviewList, ContentSafety } from "@/components/email-preview";
import { EmailPreviewModal } from "@/components/email-preview-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Filter, RefreshCw, Shield, Mail, Inbox } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

// Match the ContentSafety enum from our component
type ApiSafety = 'safe' | 'warning' | 'unsafe' | 'unknown';

// Helper function to convert API safety to ContentSafety enum
const mapApiSafetyToEnum = (safety: ApiSafety): ContentSafety => {
  switch (safety) {
    case 'safe': return ContentSafety.SAFE;
    case 'warning': return ContentSafety.WARNING;
    case 'unsafe': return ContentSafety.UNSAFE;
    default: return ContentSafety.UNKNOWN;
  }
};

interface EmailContentAnalysis {
  id?: string;
  subject: string;
  sender: string;
  date: string;
  contentHtml: string;
  contentText: string;
  safety: ApiSafety;
  matchedRules?: Array<{
    id: number;
    rule_text: string;
    is_regex: boolean;
  }>;
}

const EmailPreviewPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [customContent, setCustomContent] = useState({
    subject: "",
    sender: "",
    contentText: ""
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get child accounts for the current user
  const { data: childAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/child-accounts', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/child-accounts?userId=${user?.id}`);
      return await res.json();
    },
    enabled: !!user?.id
  });

  // Get email previews for the selected child account
  const { data: emails, isLoading: isLoadingEmails } = useQuery<EmailContentAnalysis[]>({
    queryKey: ['/api/email-previews', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const res = await apiRequest('GET', `/api/email-previews/${selectedChildId}`);
      return await res.json();
    },
    enabled: !!selectedChildId
  });

  // Get detailed email content when an email is selected
  const { data: selectedEmail, isLoading: isLoadingEmail } = useQuery<EmailContentAnalysis>({
    queryKey: ['/api/email-content', selectedEmailId],
    queryFn: async () => {
      if (!selectedEmailId) return null;
      const res = await apiRequest('GET', `/api/email-content/${selectedEmailId}`);
      return await res.json();
    },
    enabled: !!selectedEmailId
  });

  // Mutation for analyzing custom content
  const analyzeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/analyze-content', data);
      return await res.json();
    },
    onSuccess: (data: EmailContentAnalysis) => {
      toast({
        title: "Content Analysis Complete",
        description: `This content was classified as ${data.safety.toUpperCase()}.`,
        // Note: Our toast component only accepts 'default' or 'destructive'
        variant: data.safety === 'unsafe' ? 'destructive' : 'default',
      });
      setCustomContent({
        subject: "",
        sender: "",
        contentText: ""
      });
      setSelectedEmailId(data.id || null);
      setIsModalOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle selecting a child account
  const handleSelectChild = (id: number) => {
    setSelectedChildId(id);
    setSelectedEmailId(null);
  };

  // Handle selecting an email from the list
  const handleSelectEmail = (email: EmailContentAnalysis) => {
    setSelectedEmailId(email.id || null);
    setIsModalOpen(true);
  };

  // Handle analyzing custom content
  const handleAnalyzeContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to analyze content.",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate({
      ...customContent,
      userId: user.id,
      childAccountId: selectedChildId 
    });
  };

  // For the delete email mutation (demo only)
  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      // This would be the real API call in a production app
      // For demo, we'll just mock a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-previews', selectedChildId] });
      setIsModalOpen(false);
      setSelectedEmailId(null);
      toast({
        title: "Email Deleted",
        description: "The email has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // For the mark as safe mutation (demo only)
  const markAsSafeMutation = useMutation({
    mutationFn: async (id: string) => {
      // This would be the real API call in a production app
      // For demo, we'll just mock a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-previews', selectedChildId] });
      setIsModalOpen(false);
      setSelectedEmailId(null);
      toast({
        title: "Email Marked as Safe",
        description: "This email will not be filtered in the future.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Convert API emails to the format expected by EmailPreviewList
  const mappedEmails = (emails || []).map(email => ({
    ...email,
    safety: mapApiSafetyToEnum(email.safety)
  }));

  // Create an adapted version of the selected email for the preview modal
  const adaptedSelectedEmail = selectedEmail ? {
    ...selectedEmail,
    safety: mapApiSafetyToEnum(selectedEmail.safety)
  } : null;

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Inbox className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Email Preview & Content Safety</h1>
        </div>
        {selectedChildId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/email-previews', selectedChildId] });
              toast({
                title: "Refreshed",
                description: "Email list has been refreshed.",
              });
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        )}
      </div>

      {/* Child account selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {childAccounts?.map((account: any) => (
          <Card 
            key={account.id}
            className={`cursor-pointer transition-all ${selectedChildId === account.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
            onClick={() => handleSelectChild(account.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle>{account.display_name}</CardTitle>
              <CardDescription>{account.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> Click to view emails
              </div>
            </CardContent>
          </Card>
        ))}

        {childAccounts?.length === 0 && (
          <Card className="col-span-1 md:col-span-3 p-6 text-center text-muted-foreground">
            <p>No child accounts found. Please add a child account first.</p>
          </Card>
        )}
      </div>

      {selectedChildId && (
        <Tabs defaultValue="emails" className="w-full">
          <TabsList>
            <TabsTrigger value="emails" className="gap-2">
              <Mail className="h-4 w-4" /> Email Activity
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="gap-2">
              <Shield className="h-4 w-4" /> Content Analyzer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="emails" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Activity</CardTitle>
                <CardDescription>
                  View recent emails processed for this account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingEmails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <EmailPreviewList 
                    emails={mappedEmails} 
                    onSelectEmail={(index) => handleSelectEmail(emails![index])} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analyzer" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Safety Analysis</CardTitle>
                <CardDescription>
                  Test how content would be evaluated by our filter system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAnalyzeContent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="Enter an email subject" 
                      value={customContent.subject}
                      onChange={(e) => setCustomContent(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sender">Sender Email</Label>
                    <Input 
                      id="sender" 
                      placeholder="sender@example.com" 
                      type="email"
                      value={customContent.sender}
                      onChange={(e) => setCustomContent(prev => ({ ...prev, sender: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Email Content</Label>
                    <textarea 
                      id="content" 
                      className="w-full min-h-[200px] p-3 rounded-md border border-input bg-background text-sm resize-y"
                      placeholder="Enter email content here..."
                      value={customContent.contentText}
                      onChange={(e) => setCustomContent(prev => ({ ...prev, contentText: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="gap-2 w-full" 
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Filter className="h-4 w-4" /> Analyze Content Safety
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Email preview modal */}
      <EmailPreviewModal 
        isOpen={isModalOpen && !!selectedEmail}
        onClose={() => {
          setIsModalOpen(false);
          // Don't clear selectedEmailId immediately to prevent UI flicker
          setTimeout(() => setSelectedEmailId(null), 300);
        }}
        email={adaptedSelectedEmail}
        onDelete={selectedEmailId ? async () => {
          await deleteEmailMutation.mutateAsync(selectedEmailId);
        } : undefined}
        onMarkSafe={selectedEmailId && selectedEmail?.safety !== 'safe' 
          ? async () => {
            await markAsSafeMutation.mutateAsync(selectedEmailId);
          } 
          : undefined
        }
        isDeleting={deleteEmailMutation.isPending}
        isMarking={markAsSafeMutation.isPending}
      />
    </div>
  );
};

export default EmailPreviewPage;