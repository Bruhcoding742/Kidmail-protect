import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChildAccount, JunkMailPreferences } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SettingsPanelProps {
  userId?: number;
  childAccounts: ChildAccount[];
}

// Form schema for junk mail preferences
const junkMailSchema = z.object({
  user_id: z.number(),
  child_account_id: z.coerce.number().optional().nullable(),
  keep_newsletters: z.boolean().default(false),
  keep_receipts: z.boolean().default(false),
  keep_social_media: z.boolean().default(false),
  auto_delete_all: z.boolean().default(false),
});

export default function SettingsPanel({ userId, childAccounts }: SettingsPanelProps) {
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  
  // Parse the selected account ID
  const selectedAccountId = selectedAccount === "all" ? null : parseInt(selectedAccount);
  
  // Fetch junk mail preferences
  const { data: junkPreferences, isLoading } = useQuery<JunkMailPreferences>({
    queryKey: ["/api/junk-mail-preferences", { userId, childAccountId: selectedAccountId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Junk mail preferences form
  const junkForm = useForm<z.infer<typeof junkMailSchema>>({
    resolver: zodResolver(junkMailSchema),
    defaultValues: {
      user_id: userId || 0,
      child_account_id: selectedAccountId,
      keep_newsletters: junkPreferences?.keep_newsletters || false,
      keep_receipts: junkPreferences?.keep_receipts || false,
      keep_social_media: junkPreferences?.keep_social_media || false,
      auto_delete_all: junkPreferences?.auto_delete_all || false,
    },
  });
  
  // Update form when preferences change
  React.useEffect(() => {
    if (junkPreferences) {
      junkForm.reset({
        user_id: userId || 0,
        child_account_id: selectedAccountId,
        keep_newsletters: junkPreferences.keep_newsletters,
        keep_receipts: junkPreferences.keep_receipts,
        keep_social_media: junkPreferences.keep_social_media,
        auto_delete_all: junkPreferences.auto_delete_all,
      });
    }
  }, [junkPreferences, userId, selectedAccountId]);
  
  // Save junk mail preferences mutation
  const saveJunkPrefsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof junkMailSchema>) => {
      // If there are existing preferences, update them
      if (junkPreferences) {
        const res = await apiRequest("PATCH", `/api/junk-mail-preferences/${junkPreferences.id}`, data);
        return await res.json();
      } 
      // Otherwise create new preferences
      else {
        const res = await apiRequest("POST", "/api/junk-mail-preferences", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your junk mail preferences have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/junk-mail-preferences"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle junk mail preferences form submission
  function onJunkPrefsSubmit(values: z.infer<typeof junkMailSchema>) {
    // Convert empty string to null for child_account_id
    if (values.child_account_id === undefined) {
      values.child_account_id = null;
    }
    
    saveJunkPrefsMutation.mutate(values);
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Select an account to configure its settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Global Settings (All Accounts)</SelectItem>
              {childAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Junk Mail Preferences</CardTitle>
          <CardDescription>
            Configure how junk mail is handled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...junkForm}>
            <form onSubmit={junkForm.handleSubmit(onJunkPrefsSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={junkForm.control}
                  name="keep_newsletters"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Keep Newsletters</FormLabel>
                        <FormDescription>
                          Keep emails that appear to be newsletters
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
                  control={junkForm.control}
                  name="keep_receipts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Keep Receipts & Orders</FormLabel>
                        <FormDescription>
                          Keep emails with receipts, orders, or confirmation details
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
                  control={junkForm.control}
                  name="keep_social_media"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Keep Social Media</FormLabel>
                        <FormDescription>
                          Keep emails from social media platforms
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
                
                <Separator className="my-4" />
                
                <FormField
                  control={junkForm.control}
                  name="auto_delete_all"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 border-amber-200 bg-amber-50">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-Delete All Junk</FormLabel>
                        <FormDescription>
                          Automatically delete all junk mail (except from trusted senders)
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
              </div>
              
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={saveJunkPrefsMutation.isPending}
                >
                  {saveJunkPrefsMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {selectedAccount !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>
              Configure email account connection details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Connection settings for the selected account */}
              {childAccounts.map((account) => {
                if (account.id.toString() !== selectedAccount) return null;
                
                return (
                  <div key={account.id} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <Input value={account.email} readOnly />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Provider</label>
                        <Input 
                          value={account.provider_id === 1 ? "iCloud" : account.provider_id === 2 ? "Gmail" : "Outlook"} 
                          readOnly 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Authentication Method</label>
                        <Input value={account.auth_method || "Password"} readOnly />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Check Interval (minutes)</label>
                        <Input 
                          type="number" 
                          min={5} 
                          defaultValue={account.check_interval || 15}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">App Password</label>
                      <Input 
                        type="password" 
                        placeholder="••••••••••••••••" 
                        defaultValue={account.app_password || ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        {account.provider_id === 1 
                          ? "For iCloud accounts, use an app-specific password" 
                          : "Leave blank to use OAuth2 authentication"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Parent Email for Notifications</label>
                      <Input 
                        defaultValue={account.forwarding_email || ""}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Filter Level</label>
                      <Select defaultValue={account.filter_level || "medium"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select filter level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (minimal filtering)</SelectItem>
                          <SelectItem value="medium">Medium (standard filtering)</SelectItem>
                          <SelectItem value="high">High (strict filtering)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button>
                        Save Connection Settings
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}