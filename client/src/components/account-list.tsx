import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ChildAccount } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  ExternalLink, 
  RefreshCw, 
  Trash, 
  Edit, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
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

interface AccountListProps {
  userId?: number;
}

export default function AccountList({ userId }: AccountListProps) {
  const { toast } = useToast();
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  
  // Fetch child accounts
  const { data: accounts, isLoading } = useQuery<ChildAccount[]>({
    queryKey: ["/api/child-accounts", { userId }],
    queryFn: getQueryFn(),
    enabled: !!userId,
  });
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("DELETE", `/api/child-accounts/${accountId}`);
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "The account has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/child-accounts"] });
      setAccountToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/child-accounts/${id}`, {
        is_active: isActive,
      });
      return await res.json();
    },
    onSuccess: (updatedAccount: ChildAccount) => {
      toast({
        title: `Account ${updatedAccount.is_active ? "activated" : "deactivated"}`,
        description: `Email monitoring for ${updatedAccount.display_name} has been ${
          updatedAccount.is_active ? "turned on" : "turned off"
        }.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/child-accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update account status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Check now mutation
  const checkNowMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await apiRequest("POST", `/api/check-now`, {
        childAccountId: accountId,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check initiated",
        description: "We're checking for new emails now.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to initiate check",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleToggleActive = (account: ChildAccount) => {
    toggleActiveMutation.mutate({
      id: account.id,
      isActive: !account.is_active,
    });
  };
  
  const handleDeleteClick = (accountId: number) => {
    setAccountToDelete(accountId);
  };
  
  const confirmDelete = () => {
    if (accountToDelete !== null) {
      deleteAccountMutation.mutate(accountToDelete);
    }
  };
  
  const handleCheckNow = (accountId: number) => {
    checkNowMutation.mutate(accountId);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You haven't added any child accounts yet. Add an account to start protecting your child's emails.
          </p>
          <Button>Add Child Account</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.id} className="overflow-hidden">
            <div className="border-b p-4 bg-muted/10 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{account.display_name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{account.email}</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm mr-2">
                  {account.is_active ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={account.is_active}
                  onCheckedChange={() => handleToggleActive(account)}
                  disabled={toggleActiveMutation.isPending}
                />
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Account Details</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Provider:</span>
                      <span>{account.provider_id === 1 ? "iCloud" : account.provider_id === 2 ? "Gmail" : "Outlook"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Auth Method:</span>
                      <span className="capitalize">{account.auth_method || "Password"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Filter Level:</span>
                      <span className="capitalize">{account.filter_level || "Medium"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Parent Email:</span>
                      <span>{account.forwarding_email}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Monitoring Status</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Check Interval:</span>
                      <span>{account.check_interval || 15} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Check:</span>
                      <span>{account.last_check ? new Date(account.last_check).toLocaleString() : "Never"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Connection Status:</span>
                      <div className="flex items-center gap-1">
                        {account.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span>Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span>Disconnected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={checkNowMutation.isPending}
                  onClick={() => handleCheckNow(account.id)}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${checkNowMutation.isPending ? 'animate-spin' : ''}`} />
                  Check Now
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteClick(account.id)}
                  disabled={deleteAccountMutation.isPending}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={accountToDelete !== null} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account and stop all monitoring. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}