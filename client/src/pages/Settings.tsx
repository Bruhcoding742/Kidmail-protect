import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Filter, Shield, Settings as SettingsIcon } from "lucide-react";

// Form validation schemas
const newAccountSchema = z.object({
  display_name: z.string().min(2, { message: "Display name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid iCloud email address" }),
  app_password: z.string().min(6, { message: "App password is required" }),
  forwarding_email: z.string().email({ message: "Please enter a valid forwarding email address" }),
  check_interval: z.number().min(5).max(60),
  is_active: z.boolean().default(true),
});

const newFilterRuleSchema = z.object({
  rule_text: z.string().min(2, { message: "Filter text must be at least 2 characters" }),
  is_regex: z.boolean().default(false),
  child_account_id: z.number().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch child accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/child-accounts'],
  });

  // Fetch filter rules
  const { data: filterRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/filter-rules'],
  });

  // Add account form
  const accountForm = useForm<z.infer<typeof newAccountSchema>>({
    resolver: zodResolver(newAccountSchema),
    defaultValues: {
      display_name: "",
      email: "",
      app_password: "",
      forwarding_email: "",
      check_interval: 15,
      is_active: true,
    },
  });

  // Add filter rule form
  const filterForm = useForm<z.infer<typeof newFilterRuleSchema>>({
    resolver: zodResolver(newFilterRuleSchema),
    defaultValues: {
      rule_text: "",
      is_regex: false,
      child_account_id: undefined,
    },
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newAccountSchema>) => {
      return apiRequest('POST', '/api/child-accounts', {
        ...data,
        user_id: 1, // For demo purposes, we're assuming user ID 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/child-accounts'] });
      accountForm.reset();
      toast({
        title: "Account added",
        description: "The child account has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add the account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add filter rule mutation
  const addFilterRuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newFilterRuleSchema>) => {
      return apiRequest('POST', '/api/filter-rules', {
        ...data,
        user_id: 1, // For demo purposes, we're assuming user ID 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/filter-rules'] });
      filterForm.reset();
      toast({
        title: "Filter rule added",
        description: "The filter rule has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add the filter rule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Form submission handlers
  const onAccountSubmit = (data: z.infer<typeof newAccountSchema>) => {
    addAccountMutation.mutate(data);
  };

  const onFilterSubmit = (data: z.infer<typeof newFilterRuleSchema>) => {
    addFilterRuleMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <SettingsIcon className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Child Email Account</CardTitle>
              <CardDescription>
                Add a child's iCloud email account to monitor for inappropriate content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={accountForm.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Child's name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>iCloud Email</FormLabel>
                          <FormControl>
                            <Input placeholder="child@icloud.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={accountForm.control}
                      name="app_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>App Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="App-specific password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Generate an app-specific password in iCloud settings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="forwarding_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forward To</FormLabel>
                          <FormControl>
                            <Input placeholder="parent@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={accountForm.control}
                      name="check_interval"
                      render={({ field: { value, onChange } }) => (
                        <FormItem>
                          <FormLabel>Check Interval (minutes): {value}</FormLabel>
                          <FormControl>
                            <Slider
                              min={5}
                              max={60}
                              step={5}
                              value={[value]}
                              onValueChange={(vals) => onChange(vals[0])}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Enable or disable monitoring for this account
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
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={addAccountMutation.isPending}
                  >
                    {addAccountMutation.isPending ? "Adding..." : "Add Account"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Managed Accounts</CardTitle>
              <CardDescription>
                Accounts currently being monitored by KidMail Protector
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="text-center py-4">Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-4 text-neutral-medium">
                  No accounts added yet. Add your first account above.
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{account.display_name}</h3>
                        <p className="text-sm text-neutral-medium">{account.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.is_active 
                            ? 'bg-success bg-opacity-10 text-success' 
                            : 'bg-neutral-light bg-opacity-50 text-neutral-medium'
                        }`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="destructive" size="sm">Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Filter Rule</CardTitle>
              <CardDescription>
                Create custom filter rules to catch inappropriate content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...filterForm}>
                <form onSubmit={filterForm.handleSubmit(onFilterSubmit)} className="space-y-6">
                  <FormField
                    control={filterForm.control}
                    name="rule_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filter Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter word or phrase to filter" {...field} />
                        </FormControl>
                        <FormDescription>
                          Emails containing this text will be forwarded to you
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={filterForm.control}
                      name="is_regex"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Use Regular Expression</FormLabel>
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
                      name="child_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apply to Account (Optional)</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            >
                              <option value="">All Accounts</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.display_name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            Leave blank to apply to all accounts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={addFilterRuleMutation.isPending}
                  >
                    {addFilterRuleMutation.isPending ? "Adding..." : "Add Filter Rule"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Default Filters</CardTitle>
              <CardDescription>
                The system includes built-in filters for common inappropriate content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Adult Content Filter</h3>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  <p className="text-sm text-neutral-medium mt-2">
                    Filters explicit sexual content, pornography, and nudity
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Gambling Filter</h3>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  <p className="text-sm text-neutral-medium mt-2">
                    Filters gambling, betting, casino, and lottery content
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Medication & Drugs Filter</h3>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  <p className="text-sm text-neutral-medium mt-2">
                    Filters pharmaceutical and recreational drug content
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Custom Filter Rules</CardTitle>
              <CardDescription>
                Your personalized filter rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-4">Loading filter rules...</div>
              ) : filterRules.length === 0 ? (
                <div className="text-center py-4 text-neutral-medium">
                  No custom filter rules added yet. Add your first rule above.
                </div>
              ) : (
                <div className="space-y-4">
                  {filterRules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{rule.rule_text}</h3>
                          {rule.is_regex && (
                            <span className="bg-primary bg-opacity-10 text-primary text-xs px-2 py-1 rounded">
                              RegEx
                            </span>
                          )}
                        </div>
                        {rule.child_account_id ? (
                          <p className="text-sm text-neutral-medium">
                            Applied to: {accounts.find(a => a.id === rule.child_account_id)?.display_name || 'Unknown'}
                          </p>
                        ) : (
                          <p className="text-sm text-neutral-medium">Applied to all accounts</p>
                        )}
                      </div>
                      <Button variant="destructive" size="sm">Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications about detected emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-neutral-medium">
                      Receive notifications when inappropriate emails are detected
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Daily Summary</h3>
                    <p className="text-sm text-neutral-medium">
                      Receive a daily summary of detected content
                    </p>
                  </div>
                  <Switch checked={false} />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">System Notifications</h3>
                    <p className="text-sm text-neutral-medium">
                      Receive notifications about system status changes
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure general system behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-neutral-medium">
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <Switch checked={false} />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Auto Check All Accounts</h3>
                    <p className="text-sm text-neutral-medium">
                      Automatically check all accounts periodically
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Log Retention Period</h3>
                    <p className="text-sm text-neutral-medium">
                      How long to keep activity logs
                    </p>
                  </div>
                  <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90" selected>90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>
                Manage your parent account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parent-email">Email Address</Label>
                    <Input id="parent-email" value="parent@example.com" readOnly />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value="parent_user" readOnly />
                  </div>
                </div>
                
                <div>
                  <Button variant="outline" className="mr-2">Change Password</Button>
                  <Button variant="outline">Update Email</Button>
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
