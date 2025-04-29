import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Activity, Inbox, Mail, Settings, Shield, Users, Bell, RefreshCw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { ChildAccount, ActivityLog, SystemStatus } from "@shared/schema";
import AddChildAccountDialog from "@/components/add-child-account-dialog";
import AccountList from "@/components/account-list";
import ActivityLogsList from "@/components/activity-logs-list";
import FilterRulesList from "@/components/filter-rules-list";
import SettingsPanel from "@/components/settings-panel";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  
  // Fetch child accounts
  const { data: childAccounts } = useQuery<ChildAccount[]>({
    queryKey: ["/api/child-accounts", { userId: user?.id }],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // Fetch activity logs
  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", { userId: user?.id }],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // Fetch system status
  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ["/api/system-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Handle check now
  const handleCheckNow = (accountId: number) => {
    toast({
      title: "Check Initiated",
      description: "We're checking for new emails now.",
    });
  };
  
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full bg-background shadow-sm">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">KidMail Protector</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm text-muted-foreground">
                Logged in as <span className="font-medium text-foreground">{user.username}</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <nav className="flex flex-col space-y-1">
              <Button 
                variant={activeTab === "dashboard" ? "default" : "ghost"} 
                className="justify-start" 
                onClick={() => setActiveTab("dashboard")}
              >
                <Inbox className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant={activeTab === "activity" ? "default" : "ghost"} 
                className="justify-start" 
                onClick={() => setActiveTab("activity")}
              >
                <Activity className="mr-2 h-4 w-4" />
                Activity
              </Button>
              <Button 
                variant={activeTab === "filters" ? "default" : "ghost"} 
                className="justify-start" 
                onClick={() => setActiveTab("filters")}
              >
                <Shield className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button 
                variant={activeTab === "settings" ? "default" : "ghost"} 
                className="justify-start" 
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Link href="/email-preview">
                <Button 
                  variant="ghost"
                  className="justify-start w-full" 
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email Preview
                </Button>
              </Link>
              <Link href="/risk-dashboard">
                <Button 
                  variant="ghost"
                  className="justify-start w-full" 
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Risk Dashboard
                </Button>
              </Link>
            </nav>
            
            {/* System status */}
            <Separator className="my-4" />
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">System Status</div>
                <div className={`h-2 w-2 rounded-full ${systemStatus?.status === "operational" ? "bg-green-500" : "bg-amber-500"}`} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {systemStatus?.status === "operational" 
                  ? "All systems operational" 
                  : "Some services degraded"}
              </div>
              {systemStatus?.last_updated && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Last updated: {new Date(systemStatus.last_updated).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          {/* Main content area */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="dashboard" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                  <Button onClick={() => setAddAccountOpen(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Add Child Account
                  </Button>
                </div>
                
                {/* Account summary cards */}
                {!childAccounts || childAccounts.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Accounts Yet</CardTitle>
                      <CardDescription>
                        Add a child account to start protecting their emails
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => setAddAccountOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        Add First Account
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {childAccounts.map(account => (
                      <Card key={account.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{account.display_name}</CardTitle>
                            <div className={`h-3 w-3 rounded-full ${account.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                          </div>
                          <CardDescription className="truncate">{account.email}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Provider:</span>
                              <span>{account.provider_id === 1 ? "iCloud" : account.provider_id === 2 ? "Gmail" : "Outlook"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last Check:</span>
                              <span>{account.last_check ? new Date(account.last_check).toLocaleString() : "Never"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Filter Level:</span>
                              <span className="capitalize">{account.filter_level || "Default"}</span>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => setActiveTab("settings")}
                              >
                                <Settings className="mr-2 h-3 w-3" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleCheckNow(account.id)}
                              >
                                <RefreshCw className="mr-2 h-3 w-3" />
                                Check Now
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Recent activity summary */}
                <h3 className="text-xl font-semibold mt-6 mb-3">Recent Activity</h3>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Latest Activity</CardTitle>
                    <CardDescription>
                      Recent events across all accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!activityLogs || activityLogs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No activity recorded yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activityLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className="mt-1">
                              {log.activity_type === "check" && <Activity className="h-4 w-4 text-blue-500" />}
                              {log.activity_type === "inappropriate_deleted" && <Bell className="h-4 w-4 text-red-500" />}
                              {log.activity_type === "error" && <Bell className="h-4 w-4 text-amber-500" />}
                              {log.activity_type === "deleted" && <Bell className="h-4 w-4 text-gray-500" />}
                              {log.activity_type === "trusted_sender" && <Shield className="h-4 w-4 text-green-500" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {log.details}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                {log.child_account_id && childAccounts && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {childAccounts.find(a => a.id === log.child_account_id)?.display_name || "Unknown Account"}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="text-center">
                          <Button variant="link" onClick={() => setActiveTab("activity")}>
                            View all activity
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">Activity Logs</h2>
                  <p className="text-muted-foreground">
                    View detailed activity across all accounts
                  </p>
                </div>
                <ActivityLogsList userId={user?.id} />
              </TabsContent>
              
              <TabsContent value="filters">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">Filter Rules</h2>
                  <p className="text-muted-foreground">
                    Manage content filtering rules and trusted senders
                  </p>
                </div>
                <FilterRulesList userId={user?.id} />
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                  <p className="text-muted-foreground">
                    Manage accounts and preferences
                  </p>
                </div>
                <SettingsPanel 
                  userId={user?.id} 
                  childAccounts={childAccounts || []} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Add account dialog */}
      <AddChildAccountDialog 
        open={addAccountOpen} 
        onOpenChange={setAddAccountOpen} 
        userId={user?.id || 0}
      />
    </div>
  );
}