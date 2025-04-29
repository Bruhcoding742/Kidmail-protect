import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FilterRule, ChildAccount, TrustedSender } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  RefreshCw, 
  Trash, 
  Plus,
  ShieldAlert,
  Check,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Form schemas
const filterRuleSchema = z.object({
  user_id: z.number(),
  child_account_id: z.coerce.number().optional().nullable(),
  rule_text: z.string().min(2, "Rule text must be at least 2 characters"),
  is_regex: z.boolean().default(false),
  description: z.string().optional(),
});

const trustedSenderSchema = z.object({
  user_id: z.number(),
  child_account_id: z.coerce.number().optional().nullable(),
  email: z.string().email("Must be a valid email address"),
  description: z.string().optional(),
});

interface FilterRulesListProps {
  userId?: number;
}

export default function FilterRulesList({ userId }: FilterRulesListProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("filter-rules");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [trustedDialogOpen, setTrustedDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  const [senderToDelete, setSenderToDelete] = useState<number | null>(null);
  
  // Fetch child accounts for the filter
  const { data: childAccounts } = useQuery<ChildAccount[]>({
    queryKey: ["/api/child-accounts", { userId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Fetch filter rules
  const { data: filterRules, isLoading: isLoadingRules } = useQuery<FilterRule[]>({
    queryKey: ["/api/filter-rules", { userId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Fetch trusted senders
  const { data: trustedSenders, isLoading: isLoadingSenders } = useQuery<TrustedSender[]>({
    queryKey: ["/api/trusted-senders", { userId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Filter rule form
  const filterForm = useForm<z.infer<typeof filterRuleSchema>>({
    resolver: zodResolver(filterRuleSchema),
    defaultValues: {
      user_id: userId || 0,
      child_account_id: null,
      rule_text: "",
      is_regex: false,
      description: "",
    },
  });
  
  // Trusted sender form
  const trustedForm = useForm<z.infer<typeof trustedSenderSchema>>({
    resolver: zodResolver(trustedSenderSchema),
    defaultValues: {
      user_id: userId || 0,
      child_account_id: null,
      email: "",
      description: "",
    },
  });
  
  // Add filter rule mutation
  const addFilterRuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof filterRuleSchema>) => {
      const res = await apiRequest("POST", "/api/filter-rules", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Filter rule added",
        description: "The filter rule has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-rules"] });
      filterForm.reset({
        user_id: userId || 0,
        child_account_id: null,
        rule_text: "",
        is_regex: false,
        description: "",
      });
      setFilterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add filter rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete filter rule mutation
  const deleteFilterRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await apiRequest("DELETE", `/api/filter-rules/${ruleId}`);
    },
    onSuccess: () => {
      toast({
        title: "Filter rule deleted",
        description: "The filter rule has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-rules"] });
      setRuleToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete filter rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add trusted sender mutation
  const addTrustedSenderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trustedSenderSchema>) => {
      const res = await apiRequest("POST", "/api/trusted-senders", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trusted sender added",
        description: "The email has been added to your trusted senders list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trusted-senders"] });
      trustedForm.reset({
        user_id: userId || 0,
        child_account_id: null,
        email: "",
        description: "",
      });
      setTrustedDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add trusted sender",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete trusted sender mutation
  const deleteTrustedSenderMutation = useMutation({
    mutationFn: async (senderId: number) => {
      await apiRequest("DELETE", `/api/trusted-senders/${senderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Trusted sender deleted",
        description: "The email has been removed from your trusted senders list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trusted-senders"] });
      setSenderToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete trusted sender",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle filter rule form submission
  function onFilterRuleSubmit(values: z.infer<typeof filterRuleSchema>) {
    // Convert empty string to null for child_account_id
    if (values.child_account_id === undefined) {
      values.child_account_id = null;
    }
    
    addFilterRuleMutation.mutate(values);
  }
  
  // Handle trusted sender form submission
  function onTrustedSenderSubmit(values: z.infer<typeof trustedSenderSchema>) {
    // Convert empty string to null for child_account_id
    if (values.child_account_id === undefined) {
      values.child_account_id = null;
    }
    
    addTrustedSenderMutation.mutate(values);
  }
  
  const getAccountName = (accountId?: number | null) => {
    if (!accountId || !childAccounts) return "All Accounts";
    const account = childAccounts.find(a => a.id === accountId);
    return account ? account.display_name : "Unknown";
  };
  
  const isLoading = isLoadingRules || isLoadingSenders;
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="filter-rules">Filter Rules</TabsTrigger>
          <TabsTrigger value="trusted-senders">Trusted Senders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="filter-rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Content Filter Rules</CardTitle>
                <CardDescription>
                  Rules for detecting inappropriate content in emails
                </CardDescription>
              </div>
              <Button onClick={() => setFilterDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {!filterRules || filterRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No custom filter rules have been added yet.</p>
                  <p className="text-sm mt-2">The system still uses default filters to protect against inappropriate content.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setFilterDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Filter Rule
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filterRules.map((rule) => (
                    <div key={rule.id} className="border rounded-md p-4 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{rule.rule_text}</span>
                          {rule.is_regex && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Regex</span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Users className="h-3 w-3 mr-1" />
                          <span>Applies to: {getAccountName(rule.child_account_id)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setRuleToDelete(rule.id)}
                        disabled={deleteFilterRuleMutation.isPending}
                      >
                        <Trash className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trusted-senders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trusted Senders</CardTitle>
                <CardDescription>
                  Emails from these addresses will never be flagged or deleted
                </CardDescription>
              </div>
              <Button onClick={() => setTrustedDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sender
              </Button>
            </CardHeader>
            <CardContent>
              {!trustedSenders || trustedSenders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>You haven't added any trusted senders yet.</p>
                  <p className="text-sm mt-2">Add email addresses that should never be filtered out.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setTrustedDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Trusted Sender
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trustedSenders.map((sender) => (
                    <div key={sender.id} className="border rounded-md p-4 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{sender.email}</span>
                        </div>
                        {sender.description && (
                          <p className="text-sm text-muted-foreground mb-2">{sender.description}</p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Users className="h-3 w-3 mr-1" />
                          <span>Applies to: {getAccountName(sender.child_account_id)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSenderToDelete(sender.id)}
                        disabled={deleteTrustedSenderMutation.isPending}
                      >
                        <Trash className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Filter Rule Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Filter Rule</DialogTitle>
            <DialogDescription>
              Create a custom rule to detect inappropriate content
            </DialogDescription>
          </DialogHeader>
          
          <Form {...filterForm}>
            <form onSubmit={filterForm.handleSubmit(onFilterRuleSubmit)} className="space-y-4">
              <FormField
                control={filterForm.control}
                name="rule_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Text</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter keyword or pattern" {...field} />
                    </FormControl>
                    <FormDescription>
                      The text or pattern to match in emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={filterForm.control}
                name="is_regex"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Use Regular Expression</FormLabel>
                      <FormDescription>
                        Enable for advanced pattern matching
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={filterForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="What does this rule detect?" {...field} />
                    </FormControl>
                    <FormDescription>
                      A brief explanation of what this rule is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={filterForm.control}
                name="child_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply To</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All Accounts</SelectItem>
                        {childAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a specific account or apply to all
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilterDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addFilterRuleMutation.isPending}
                >
                  {addFilterRuleMutation.isPending ? "Adding..." : "Add Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add Trusted Sender Dialog */}
      <Dialog open={trustedDialogOpen} onOpenChange={setTrustedDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Trusted Sender</DialogTitle>
            <DialogDescription>
              Add an email address that should never be filtered
            </DialogDescription>
          </DialogHeader>
          
          <Form {...trustedForm}>
            <form onSubmit={trustedForm.handleSubmit(onTrustedSenderSubmit)} className="space-y-4">
              <FormField
                control={trustedForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Emails from this address will never be filtered or deleted
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={trustedForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Who is this sender?" {...field} />
                    </FormControl>
                    <FormDescription>
                      A note to help you remember who this is
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={trustedForm.control}
                name="child_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply To</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All Accounts</SelectItem>
                        {childAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a specific account or apply to all
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTrustedDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addTrustedSenderMutation.isPending}
                >
                  {addTrustedSenderMutation.isPending ? "Adding..." : "Add Trusted Sender"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Filter Rule Confirmation */}
      <AlertDialog open={ruleToDelete !== null} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this filter rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => ruleToDelete !== null && deleteFilterRuleMutation.mutate(ruleToDelete)}
              disabled={deleteFilterRuleMutation.isPending}
            >
              {deleteFilterRuleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Trusted Sender Confirmation */}
      <AlertDialog open={senderToDelete !== null} onOpenChange={(open) => !open && setSenderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trusted Sender</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this email from your trusted senders list? 
              Emails from this address may now be filtered or deleted if they match filter rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => senderToDelete !== null && deleteTrustedSenderMutation.mutate(senderToDelete)}
              disabled={deleteTrustedSenderMutation.isPending}
            >
              {deleteTrustedSenderMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}