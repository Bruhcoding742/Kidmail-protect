import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertChildAccountSchema } from "@shared/schema";

// Form schema based on the insert schema
const formSchema = z.object({
  user_id: z.number(),
  email: z.string().email("Please enter a valid email address"),
  display_name: z.string().min(1, "Please enter a display name"),
  provider_id: z.coerce.number().min(1, "Please select a provider"),
  auth_method: z.enum(["password", "oauth2"]),
  password: z.string().optional(),
  forwarding_email: z.string().email("Please enter a valid forwarding email address"),
  check_interval: z.coerce.number().min(5, "Minimum interval is 5 minutes").optional(),
  filter_level: z.enum(["low", "medium", "high"]).optional()
});

interface AddChildAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export default function AddChildAccountDialog({ open, onOpenChange, userId }: AddChildAccountDialogProps) {
  const { toast } = useToast();
  const [authMethod, setAuthMethod] = useState<"password" | "oauth2">("password");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: userId,
      email: "",
      display_name: "",
      provider_id: undefined,
      auth_method: "password",
      password: "",
      forwarding_email: "",
      check_interval: 15,
      filter_level: "medium"
    },
  });
  
  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (accountData: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/child-accounts", accountData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account added",
        description: "The child account has been added successfully.",
      });
      // Invalidate child accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/child-accounts"] });
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add account",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Remove password if auth method is OAuth2
    if (values.auth_method === "oauth2") {
      delete values.password;
    }
    
    addAccountMutation.mutate(values);
  }
  
  // Update form when provider changes
  const watchProvider = form.watch("provider_id");
  
  // Update auth method when provider changes
  // iCloud (1) uses password, Gmail (2) and Outlook (3) use OAuth2
  const handleProviderChange = (providerId: string) => {
    const id = parseInt(providerId);
    const method = id === 1 ? "password" : "oauth2";
    setAuthMethod(method);
    form.setValue("auth_method", method);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Child Account</DialogTitle>
          <DialogDescription>
            Add a child's email account to monitor and protect
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Child's name" {...field} />
                  </FormControl>
                  <FormDescription>A name to identify this account</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="child@example.com" {...field} />
                  </FormControl>
                  <FormDescription>The email address to monitor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="provider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Provider</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleProviderChange(value);
                    }} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">iCloud</SelectItem>
                      <SelectItem value="2">Gmail</SelectItem>
                      <SelectItem value="3">Outlook</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the email service provider</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {authMethod === "password" && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      For iCloud accounts, use an app-specific password (not the main account password)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="forwarding_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Email</FormLabel>
                  <FormControl>
                    <Input placeholder="parent@example.com" {...field} />
                  </FormControl>
                  <FormDescription>Where to send notifications</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="check_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check Interval (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} {...field} />
                  </FormControl>
                  <FormDescription>How often to check for new emails</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="filter_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filter Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select filter level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low (minimal filtering)</SelectItem>
                      <SelectItem value="medium">Medium (standard filtering)</SelectItem>
                      <SelectItem value="high">High (strict filtering)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Sensitivity level for content filtering</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addAccountMutation.isPending}
              >
                {addAccountMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}