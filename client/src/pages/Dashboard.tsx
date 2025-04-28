import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Check, 
  MoreHorizontal, 
  RotateCw 
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface ChildAccount {
  id: number;
  email: string;
  display_name: string;
  is_active: boolean;
  last_check: string | null;
  last_forward: string | null;
  forwarding_email: string;
}

interface ActivityLog {
  id: number;
  child_account_id: number;
  activity_type: string;
  details: string;
  sender_email: string | null;
  created_at: string;
}

interface SystemStatus {
  status: string;
  last_updated: string;
  details: string | null;
}

export default function Dashboard() {
  // Fetch child accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<ChildAccount[]>({
    queryKey: ['/api/child-accounts'],
  });

  // Fetch recent activity logs
  const { data: recentLogs = [], isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs', { limit: 4 }],
  });

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ['/api/system-status'],
  });

  // Calculate statistics
  const protectedCount = recentLogs.filter(log => 
    log.activity_type === 'filter_match' || log.activity_type === 'forward'
  ).length;

  const lastDetected = recentLogs.find(log => log.activity_type === 'filter_match')?.created_at;

  const lastChecked = accounts.reduce((latest, account) => {
    if (!account.last_check) return latest;
    return !latest || new Date(account.last_check) > new Date(latest) 
      ? account.last_check 
      : latest;
  }, null as string | null);

  // Manual check mutation
  const checkNowMutation = useMutation({
    mutationFn: async (childAccountId: number) => {
      return apiRequest('POST', '/api/check-now', { childAccountId });
    },
    onSuccess: () => {
      // We'd show a toast notification here
    }
  });

  // Format a date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      const today = new Date();
      
      const isToday = date.getDate() === today.getDate() && 
                     date.getMonth() === today.getMonth() && 
                     date.getFullYear() === today.getFullYear();
      
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      if (isToday) {
        return `Today, ${formattedTime}`;
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isYesterday = date.getDate() === yesterday.getDate() && 
                           date.getMonth() === yesterday.getMonth() && 
                           date.getFullYear() === yesterday.getFullYear();
        
        if (isYesterday) {
          return `Yesterday, ${formattedTime}`;
        } else {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }) + `, ${formattedTime}`;
        }
      }
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div id="dashboard" className="space-y-6">
      {/* Status Card */}
      <Card>
        <div className="px-6 py-5 sm:px-8 border-b border-neutral-light">
          <h2 className="text-lg font-medium text-neutral-dark">Protection Status</h2>
        </div>
        <CardContent className="px-6 sm:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="h-10 w-10 rounded-full bg-success bg-opacity-10 flex items-center justify-center text-success">
                <Check className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-neutral-dark">KidMail Protector is active</h3>
                <p className="text-sm text-neutral-medium">
                  Last check: {lastChecked ? formatDistanceToNow(new Date(lastChecked), { addSuffix: true }) : 'Never'}
                </p>
              </div>
            </div>
            <div>
              <Button 
                onClick={() => {
                  if (accounts.length > 0) {
                    checkNowMutation.mutate(accounts[0].id);
                  }
                }}
                disabled={accounts.length === 0 || checkNowMutation.isPending}
              >
                {checkNowMutation.isPending ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Now'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Emails Protected Card */}
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-3 text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-neutral-medium truncate">Emails Protected</dt>
                  <dd className="mt-1 text-2xl font-semibold text-neutral-dark">{protectedCount}</dd>
                </div>
              </div>
            </div>
            <div className="bg-neutral-lightest px-5 py-3">
              <div className="text-sm text-neutral-medium">
                <span className="text-success font-medium">↑ 12%</span> from last week
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Detected Card */}
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-warning bg-opacity-10 rounded-md p-3 text-warning">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-neutral-medium truncate">Last Detected</dt>
                  <dd className="mt-1 text-lg font-semibold text-neutral-dark">
                    {lastDetected ? formatDate(lastDetected) : 'No detections yet'}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-neutral-lightest px-5 py-3">
              <div className="text-sm text-neutral-medium">
                <Link href="/logs" className="text-primary hover:text-primary-dark">
                  View logs →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status Card */}
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-success bg-opacity-10 rounded-md p-3 text-success">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-neutral-medium truncate">System Status</dt>
                  <dd className="mt-1 text-lg font-semibold text-success">
                    {statusLoading ? 'Loading...' : (
                      systemStatus?.status === 'operational' ? 'All Systems Operational' : systemStatus?.status
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-neutral-lightest px-5 py-3">
              <div className="text-sm text-neutral-medium">
                Updated {systemStatus?.last_updated 
                  ? formatDistanceToNow(new Date(systemStatus.last_updated), { addSuffix: true }) 
                  : 'recently'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protected Accounts Card */}
      <Card>
        <div className="px-6 py-5 sm:px-8 border-b border-neutral-light">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-dark">Protected Accounts</h2>
            <Button variant="outline" size="sm">
              Add Account
            </Button>
          </div>
        </div>
        <CardContent className="px-6 sm:px-8 py-6">
          {accountsLoading ? (
            <div className="py-4 text-center text-neutral-medium">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-4 text-center text-neutral-medium">No accounts configured yet</div>
          ) : (
            accounts.map((account, index) => (
              <div 
                key={account.id} 
                className={`py-4 ${index < accounts.length - 1 ? 'border-b border-neutral-light' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-secondary-light flex items-center justify-center text-primary">
                      <span className="text-base font-medium">
                        {account.display_name
                          .split(' ')
                          .map(part => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-base font-medium text-neutral-dark">{account.display_name}</h3>
                      <p className="text-sm text-neutral-medium">{account.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.is_active 
                        ? 'bg-success bg-opacity-10 text-success' 
                        : 'bg-neutral-light bg-opacity-50 text-neutral-medium'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button className="text-neutral-medium hover:text-neutral-dark">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-medium">Forwarding to:</p>
                    <p className="font-medium">{account.forwarding_email}</p>
                  </div>
                  <div>
                    <p className="text-neutral-medium">Last forwarded:</p>
                    <p className="font-medium text-neutral-dark">
                      {account.last_forward ? formatDate(account.last_forward) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <div className="px-6 py-5 sm:px-8 border-b border-neutral-light">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-dark">Recent Activity</h2>
            <Link href="/logs" className="text-sm font-medium text-primary hover:text-primary-dark">
              View all logs
            </Link>
          </div>
        </div>
        <CardContent className="px-6 sm:px-8 py-6">
          <div className="flow-root">
            {logsLoading ? (
              <div className="py-4 text-center text-neutral-medium">Loading activity...</div>
            ) : recentLogs.length === 0 ? (
              <div className="py-4 text-center text-neutral-medium">No activity recorded yet</div>
            ) : (
              <ul className="-mb-8">
                {recentLogs.map((log, index) => {
                  // Determine icon and background color based on activity type
                  let icon = <Activity className="h-5 w-5" />;
                  let bgColor = "bg-primary bg-opacity-10";
                  let textColor = "text-primary";
                  
                  if (log.activity_type === 'filter_match' || log.activity_type === 'forward') {
                    icon = <AlertTriangle className="h-5 w-5" />;
                    bgColor = "bg-warning bg-opacity-10";
                    textColor = "text-warning";
                  } else if (log.activity_type === 'error') {
                    icon = <AlertTriangle className="h-5 w-5" />;
                    bgColor = "bg-destructive bg-opacity-10";
                    textColor = "text-destructive";
                  } else if (log.activity_type === 'account_added') {
                    icon = <Check className="h-5 w-5" />;
                    bgColor = "bg-success bg-opacity-10";
                    textColor = "text-success";
                  }
                  
                  // Find associated account
                  const account = accounts.find(a => a.id === log.child_account_id);
                  
                  return (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {index < recentLogs.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-light" aria-hidden="true"></span>
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center ring-8 ring-white ${textColor}`}>
                              {icon}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-neutral-dark">
                                {log.activity_type === 'filter_match' && 'Inappropriate email detected and forwarded from '}
                                {log.activity_type === 'check' && 'System automatically checked '}
                                {log.activity_type === 'error' && 'Error occurred while checking '}
                                {log.activity_type === 'account_added' && 'Added new protected account '}
                                <span className="font-medium">{account?.display_name || 'Unknown Account'}</span>
                              </p>
                              {log.sender_email && (
                                <p className="mt-1 text-xs text-neutral-medium">
                                  Sender: {log.sender_email}
                                </p>
                              )}
                              {!log.sender_email && log.details && (
                                <p className="mt-1 text-xs text-neutral-medium">
                                  {log.details}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-neutral-medium">
                              <time dateTime={log.created_at}>
                                {formatDate(log.created_at)}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
