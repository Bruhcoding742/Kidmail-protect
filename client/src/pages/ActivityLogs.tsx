import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Activity, 
  Check, 
  RefreshCw,
  Calendar,
  Search,
  Download 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ActivityLog {
  id: number;
  user_id: number;
  child_account_id: number;
  activity_type: string;
  details: string;
  sender_email: string | null;
  created_at: string;
}

interface ChildAccount {
  id: number;
  display_name: string;
  email: string;
}

export default function ActivityLogs() {
  // State for filtering and pagination
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dateRange, setDateRange] = useState<string>("all");
  const logsPerPage = 10;

  // Fetch child accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<ChildAccount[]>({
    queryKey: ['/api/child-accounts'],
  });

  // Fetch activity logs with the current filters
  const { data: logs = [], isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs', { 
      limit: 100, // Fetch more and filter client-side for demo
      childAccountId: accountFilter !== "all" ? parseInt(accountFilter) : undefined,
    }],
  });

  // Apply client-side filters
  const filteredLogs = logs.filter(log => {
    // Filter by activity type
    if (activityTypeFilter !== "all" && log.activity_type !== activityTypeFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const hasMatch = 
        (log.details && log.details.toLowerCase().includes(query)) ||
        (log.sender_email && log.sender_email.toLowerCase().includes(query));
      
      if (!hasMatch) {
        return false;
      }
    }
    
    // Filter by date range
    if (dateRange !== "all") {
      const logDate = new Date(log.created_at);
      const now = new Date();
      
      switch (dateRange) {
        case "today":
          if (logDate.getDate() !== now.getDate() || 
              logDate.getMonth() !== now.getMonth() || 
              logDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
          break;
        case "week":
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          if (logDate < oneWeekAgo) {
            return false;
          }
          break;
        case "month":
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (logDate < oneMonthAgo) {
            return false;
          }
          break;
      }
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        full: format(date, 'MMM d, yyyy h:mm a')
      };
    } catch (e) {
      return { relative: 'Invalid date', full: 'Invalid date' };
    }
  };

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [accountFilter, activityTypeFilter, searchQuery, dateRange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Activity Logs</span>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Logs
            </Button>
          </CardTitle>
          <CardDescription>
            View detailed activity logs for all monitored accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Account</label>
                <Select 
                  value={accountFilter} 
                  onValueChange={setAccountFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Activity Type</label>
                <Select 
                  value={activityTypeFilter} 
                  onValueChange={setActivityTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="check">Account Check</SelectItem>
                    <SelectItem value="filter_match">Content Filtered</SelectItem>
                    <SelectItem value="forward">Email Forwarded</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Time Period</label>
                <Select 
                  value={dateRange} 
                  onValueChange={setDateRange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-medium" />
                  <Input
                    placeholder="Search logs..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Logs Table */}
            <div className="rounded-md border">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-neutral-lightest">
                      <th className="h-12 px-4 text-left font-medium">Type</th>
                      <th className="h-12 px-4 text-left font-medium">Account</th>
                      <th className="h-12 px-4 text-left font-medium">Details</th>
                      <th className="h-12 px-4 text-left font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-neutral-medium">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading activity logs...
                        </td>
                      </tr>
                    ) : paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-neutral-medium">
                          No logs found matching your filters
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map(log => {
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
                        const formattedDate = formatDate(log.created_at);
                        
                        return (
                          <tr key={log.id} className="border-b">
                            <td className="px-4 py-4">
                              <div className={`${bgColor} ${textColor} h-8 w-8 rounded-full flex items-center justify-center`}>
                                {icon}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <div className="font-medium">{account?.display_name || 'Unknown'}</div>
                                <div className="text-xs text-neutral-medium">{account?.email || 'Unknown'}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <div className="font-medium">
                                  {log.activity_type === 'check' && 'Account check performed'}
                                  {log.activity_type === 'filter_match' && 'Inappropriate content detected'}
                                  {log.activity_type === 'forward' && 'Email forwarded'}
                                  {log.activity_type === 'error' && 'Error occurred'}
                                  {log.activity_type === 'account_added' && 'Account added'}
                                </div>
                                {log.details && (
                                  <div className="text-xs text-neutral-medium">{log.details}</div>
                                )}
                                {log.sender_email && (
                                  <div className="text-xs text-neutral-medium">
                                    Sender: {log.sender_email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-neutral-medium">
                                <div title={formattedDate.full}>{formattedDate.relative}</div>
                                <div className="text-xs">{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            {!logsLoading && filteredLogs.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-medium">
                  Showing {startIndex + 1}-{Math.min(startIndex + logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      // Logic for showing pagination numbers around the current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            <CardTitle>Activity Calendar</CardTitle>
          </div>
          <CardDescription>
            Calendar view of activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-neutral-medium">
            Activity calendar visualization will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
