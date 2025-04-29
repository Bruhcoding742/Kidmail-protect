import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { ActivityLog, ChildAccount } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  Bell,
  Clock,
  Shield,
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Trash,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ActivityLogsListProps {
  userId?: number;
}

export default function ActivityLogsList({ userId }: ActivityLogsListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(50);
  
  // Fetch child accounts for the filter
  const { data: childAccounts } = useQuery<ChildAccount[]>({
    queryKey: ["/api/child-accounts", { userId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Fetch activity logs
  const { data: activityLogs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", { userId, limit }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Filter logs based on active tab, selected account, and search term
  const filteredLogs = activityLogs?.filter((log) => {
    // Filter by tab (activity type)
    if (activeTab !== "all" && log.activity_type !== activeTab) {
      return false;
    }
    
    // Filter by account
    if (selectedAccount !== "all" && log.child_account_id !== parseInt(selectedAccount)) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !log.details.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "check":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "inappropriate_deleted":
        return <Ban className="h-4 w-4 text-red-500" />;
      case "deleted":
        return <Trash className="h-4 w-4 text-gray-500" />;
      case "kept":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "trusted_sender":
        return <Shield className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getActivityLabel = (type: string) => {
    switch (type) {
      case "check":
        return "Check";
      case "inappropriate_deleted":
        return "Deleted (Inappropriate)";
      case "deleted":
        return "Deleted";
      case "kept":
        return "Kept";
      case "trusted_sender":
        return "Trusted Sender";
      case "error":
        return "Error";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  
  const getAccountName = (accountId?: number) => {
    if (!accountId || !childAccounts) return "Unknown";
    const account = childAccounts.find(a => a.id === accountId);
    return account ? account.display_name : "Unknown";
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No activity has been recorded yet. Activity logs will appear here once your child's emails are processed.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {childAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Activity type tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex overflow-x-auto">
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="check">Checks</TabsTrigger>
              <TabsTrigger value="inappropriate_deleted">Inappropriate</TabsTrigger>
              <TabsTrigger value="deleted">Deleted</TabsTrigger>
              <TabsTrigger value="kept">Kept</TabsTrigger>
              <TabsTrigger value="trusted_sender">Trusted</TabsTrigger>
              <TabsTrigger value="error">Errors</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Activity logs list */}
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-3 pt-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex border rounded-md p-3">
                  <div className="mr-3 mt-1">
                    {getActivityIcon(log.activity_type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">
                      {log.details}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>{getActivityLabel(log.activity_type)}</span>
                      </div>
                      {log.child_account_id && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          <span>{getAccountName(log.child_account_id)}</span>
                        </div>
                      )}
                      {log.sender_email && (
                        <div className="flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          <span>{log.sender_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load more button */}
              {(activityLogs?.length || 0) >= limit && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setLimit(prev => prev + 50)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No matching logs found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}