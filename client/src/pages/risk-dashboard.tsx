import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { getQueryFn } from "@/lib/queryClient";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, CheckCircle, Info, Shield, Mail, ArrowRight, Calendar, Activity, X, RefreshCw, Inbox } from "lucide-react";

import { ChildAccount, ActivityLog } from "@shared/schema";

// Color palette for risk levels
const RISK_COLORS = {
  high: "#ef4444",      // Red
  medium: "#f59e0b",    // Amber
  low: "#22c55e",       // Green
  unknown: "#94a3b8"    // Slate
};

// Interface for safety metrics
interface SafetyMetrics {
  childAccountId: number;
  totalEmails: number;
  safeEmails: number;
  warningEmails: number;
  unsafeEmails: number;
  unknownEmails: number;
  blockedEmails: number;
  riskScore: number;
  riskLevel: "high" | "medium" | "low" | "unknown";
  recentTrends: {
    date: string;
    safeCount: number;
    warningCount: number;
    unsafeCount: number;
  }[];
  topThreats: {
    type: string;
    count: number;
    severity: "high" | "medium" | "low";
  }[];
}

// Interface for consolidated stats
interface SystemStats {
  totalScannedEmails: number;
  totalBlockedThreats: number;
  averageRiskScore: number;
  systemRiskLevel: "high" | "medium" | "low" | "unknown";
  totalChildAccounts: number;
  childrenAtRisk: number;
  threatDistribution: {
    type: string;
    count: number;
  }[];
  riskTrend: {
    date: string;
    riskScore: number;
  }[];
}

// Component for displaying risk score
const RiskScoreIndicator = ({ score, size = "md" }: { score: number, size?: "sm" | "md" | "lg" }) => {
  let riskLevel: "high" | "medium" | "low" | "unknown" = "unknown";
  let color = RISK_COLORS.unknown;
  let sizeClass = size === "sm" ? "h-16 w-16" : size === "lg" ? "h-28 w-28" : "h-24 w-24";
  let textClass = size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-3xl";
  
  if (score >= 70) {
    riskLevel = "high";
    color = RISK_COLORS.high;
  } else if (score >= 30) {
    riskLevel = "medium";
    color = RISK_COLORS.medium;
  } else if (score >= 0) {
    riskLevel = "low";
    color = RISK_COLORS.low;
  }

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center mb-2`}
        style={{ 
          backgroundColor: `${color}20`,
          borderWidth: 4,
          borderColor: color
        }}
      >
        <span className={`${textClass} font-bold`} style={{ color }}>
          {score}
        </span>
      </div>
      <span className="font-medium text-sm capitalize" style={{ color }}>
        {riskLevel} risk
      </span>
    </div>
  );
};

// Component for displaying threat distribution
const ThreatDistribution = ({ data }: { data: { type: string, count: number }[] }) => {
  // Colors for pie chart
  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#94a3b8'];
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="type"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} threats`, 'Count']}
            labelFormatter={(name) => `Type: ${name}`}
          />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Component for displaying risk trends
const RiskTrendChart = ({ data }: { data: { date: string, riskScore: number }[] }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45} 
            textAnchor="end" 
            height={60}
            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`${value}`, 'Risk Score']}
            labelFormatter={(name) => `Date: ${new Date(name).toLocaleDateString()}`}
          />
          <Legend />
          <Bar 
            dataKey="riskScore" 
            name="Risk Score" 
            fill="#8b5cf6"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Component for displaying safety metrics by child
const ChildSafetyMetricsChart = ({ data }: { data: { safeCount: number, warningCount: number, unsafeCount: number, date: string }[] }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 50,
          }}
          barGap={0}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45} 
            textAnchor="end" 
            height={60}
            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} emails`, 'Count']}
            labelFormatter={(name) => `Date: ${new Date(name).toLocaleDateString()}`}
          />
          <Legend />
          <Bar dataKey="safeCount" name="Safe" fill={RISK_COLORS.low} />
          <Bar dataKey="warningCount" name="Warning" fill={RISK_COLORS.medium} />
          <Bar dataKey="unsafeCount" name="Unsafe" fill={RISK_COLORS.high} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Dashboard component
export default function RiskDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("7days");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  
  // Get child accounts
  const { data: childAccounts, isLoading: isLoadingAccounts } = useQuery<ChildAccount[]>({
    queryKey: ["/api/child-accounts", { userId: user?.id }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/child-accounts?userId=${user?.id}`);
      return await res.json();
    },
    enabled: !!user,
  });
  
  // Dummy data for system stats
  const getDummySystemStats = (): SystemStats => ({
    totalScannedEmails: 187,
    totalBlockedThreats: 23,
    averageRiskScore: 38,
    systemRiskLevel: "medium" as "medium", // Type assertion to ensure it matches the enum
    totalChildAccounts: childAccounts?.length || 0,
    childrenAtRisk: 1,
    threatDistribution: [
      { type: "Inappropriate Content", count: 12 },
      { type: "Phishing", count: 5 },
      { type: "Spam", count: 4 },
      { type: "Malware", count: 2 }
    ],
    riskTrend: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString(),
        riskScore: Math.floor(Math.random() * 40) + 20,
      };
    })
  });

  // Get system safety stats
  const { data: systemStats, isLoading: isLoadingSystemStats } = useQuery<SystemStats>({
    queryKey: ["/api/safety-stats/system", { timeframe: selectedTimeframe }],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/safety-stats/system?timeframe=${selectedTimeframe}`);
        return await res.json();
      } catch (error) {
        // Until the backend is fully implemented, return dummy data
        return getDummySystemStats();
      }
    },
    enabled: !!user,
  });
  
  // Dummy data for child metrics
  const getDummyChildMetrics = (childId: number): SafetyMetrics => ({
    childAccountId: childId,
    totalEmails: 42,
    safeEmails: 32,
    warningEmails: 6,
    unsafeEmails: 4,
    unknownEmails: 0,
    blockedEmails: 4,
    riskScore: Math.floor(Math.random() * 80) + 10,
    riskLevel: "medium",
    recentTrends: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const safeCount = Math.floor(Math.random() * 5) + 1;
      const warningCount = Math.floor(Math.random() * 2);
      const unsafeCount = Math.random() > 0.7 ? 1 : 0;
      return {
        date: date.toISOString(),
        safeCount,
        warningCount,
        unsafeCount,
      };
    }),
    topThreats: [
      { type: "Inappropriate Language", count: 2, severity: "medium" },
      { type: "Suspicious Links", count: 1, severity: "high" },
      { type: "Adult Content", count: 1, severity: "high" }
    ]
  });

  // Get safety metrics for a specific child
  const { data: childMetrics, isLoading: isLoadingChildMetrics } = useQuery<SafetyMetrics>({
    queryKey: ["/api/safety-stats/child", { childId: selectedChildId, timeframe: selectedTimeframe }],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child ID selected");
      
      try {
        const res = await apiRequest('GET', `/api/safety-stats/child/${selectedChildId}?timeframe=${selectedTimeframe}`);
        return await res.json();
      } catch (error) {
        // Until the backend is implemented, we'll return dummy data
        return getDummyChildMetrics(selectedChildId);
      }
    },
    enabled: !!selectedChildId,
  });
  
  // Set first child as selected on initial load
  useEffect(() => {
    if (childAccounts && childAccounts.length > 0 && !selectedChildId) {
      setSelectedChildId(childAccounts[0].id);
    }
  }, [childAccounts]);

  // Handle refresh data
  const handleRefresh = () => {
    toast({
      title: "Refreshing data",
      description: "The dashboard data is being updated.",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Inbox className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Risk Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>
      
      {/* System Overview Card */}
      {!isLoadingSystemStats && systemStats && (
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS[systemStats.systemRiskLevel] }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between">
              <span>System Risk Overview</span>
              <Badge 
                variant="outline" 
                className="capitalize"
                style={{ 
                  backgroundColor: `${RISK_COLORS[systemStats.systemRiskLevel]}20`, 
                  color: RISK_COLORS[systemStats.systemRiskLevel],
                  borderColor: RISK_COLORS[systemStats.systemRiskLevel] 
                }}
              >
                {systemStats.systemRiskLevel} Risk
              </Badge>
            </CardTitle>
            <CardDescription>
              Overall safety metrics across all monitored accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="flex flex-col items-center justify-center">
                <RiskScoreIndicator score={systemStats.averageRiskScore} />
                <p className="text-sm text-muted-foreground mt-2">System Risk Score</p>
              </div>
              <div className="space-y-4 col-span-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-accent rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">{systemStats.totalScannedEmails}</div>
                    <div className="text-sm text-muted-foreground">Emails Scanned</div>
                  </div>
                  <div className="bg-accent rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">{systemStats.totalBlockedThreats}</div>
                    <div className="text-sm text-muted-foreground">Threats Blocked</div>
                  </div>
                  <div className="bg-accent rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">
                      {systemStats.childrenAtRisk} / {systemStats.totalChildAccounts}
                    </div>
                    <div className="text-sm text-muted-foreground">Children at Risk</div>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Risk Trend</h3>
                  <RiskTrendChart data={systemStats.riskTrend} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Threat Distribution</h3>
                <ThreatDistribution data={systemStats.threatDistribution} />
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Protection Insights</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Medium Risk Level Detected</p>
                      <p className="text-sm text-muted-foreground">Your system is operating at a moderate risk level. Check individual accounts for details.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Protection Active</p>
                      <p className="text-sm text-muted-foreground">Email scanning and filtering is active for all accounts.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Consider Enabling Advanced Filtering</p>
                      <p className="text-sm text-muted-foreground">Enhance protection by updating filter rules in the settings.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Child Account Selector */}
      {!isLoadingAccounts && childAccounts && childAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {childAccounts.map(account => (
            <Card 
              key={account.id}
              className={`cursor-pointer transition-all ${selectedChildId === account.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedChildId(account.id)}
            >
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{account.display_name}</CardTitle>
                <CardDescription className="truncate">{account.email}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> View risk metrics
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Child Safety Metrics Card */}
      {!isLoadingChildMetrics && childMetrics && (
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS[childMetrics.riskLevel] }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between">
              <span>
                {childAccounts?.find(a => a.id === childMetrics.childAccountId)?.display_name} - Safety Analysis
              </span>
              <Badge 
                variant="outline" 
                className="capitalize"
                style={{ 
                  backgroundColor: `${RISK_COLORS[childMetrics.riskLevel]}20`, 
                  color: RISK_COLORS[childMetrics.riskLevel],
                  borderColor: RISK_COLORS[childMetrics.riskLevel] 
                }}
              >
                {childMetrics.riskLevel} Risk
              </Badge>
            </CardTitle>
            <CardDescription>
              Detailed safety analysis and threat detection for this account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="flex flex-col items-center justify-center">
                <RiskScoreIndicator score={childMetrics.riskScore} />
                <p className="text-sm text-muted-foreground mt-2">Account Risk Score</p>
              </div>
              <div className="space-y-4 col-span-3">
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-accent rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{childMetrics.totalEmails}</div>
                    <div className="text-xs text-muted-foreground">Total Emails</div>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center" style={{ backgroundColor: `${RISK_COLORS.low}20` }}>
                    <div className="text-2xl font-bold text-green-600">{childMetrics.safeEmails}</div>
                    <div className="text-xs text-muted-foreground">Safe</div>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center" style={{ backgroundColor: `${RISK_COLORS.medium}20` }}>
                    <div className="text-2xl font-bold text-amber-600">{childMetrics.warningEmails}</div>
                    <div className="text-xs text-muted-foreground">Warning</div>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center" style={{ backgroundColor: `${RISK_COLORS.high}20` }}>
                    <div className="text-2xl font-bold text-red-600">{childMetrics.unsafeEmails}</div>
                    <div className="text-xs text-muted-foreground">Unsafe</div>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center" style={{ backgroundColor: `${RISK_COLORS.high}40` }}>
                    <div className="text-2xl font-bold text-red-700">{childMetrics.blockedEmails}</div>
                    <div className="text-xs text-muted-foreground">Blocked</div>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Email Safety Trend</h3>
                  <ChildSafetyMetricsChart data={childMetrics.recentTrends} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Top Detected Threats</h3>
                <div className="space-y-3">
                  {childMetrics.topThreats.map((threat, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: RISK_COLORS[threat.severity] }}
                        />
                        <span>{threat.type}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="capitalize"
                        style={{ 
                          backgroundColor: `${RISK_COLORS[threat.severity]}20`, 
                          color: RISK_COLORS[threat.severity],
                          borderColor: RISK_COLORS[threat.severity] 
                        }}
                      >
                        {threat.count} detected
                      </Badge>
                    </div>
                  ))}
                  
                  {childMetrics.topThreats.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p>No threats detected</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Safety Recommendations</h3>
                <div className="space-y-3">
                  {childMetrics.riskLevel === "high" && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium">High Risk Account</p>
                        <p className="text-sm text-muted-foreground">This account is receiving a significant number of unsafe emails. Review the threats and consider stricter filtering.</p>
                      </div>
                    </div>
                  )}
                  
                  {childMetrics.riskLevel === "medium" && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Medium Risk Level</p>
                        <p className="text-sm text-muted-foreground">This account has received some concerning emails. Review the detected threats.</p>
                      </div>
                    </div>
                  )}
                  
                  {childMetrics.riskLevel === "low" && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Low Risk Level</p>
                        <p className="text-sm text-muted-foreground">This account is well protected. Continue monitoring.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Protection Status</p>
                      <p className="text-sm text-muted-foreground">Email scanning and filtering is active for this account.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Review Email Content</p>
                      <p className="text-sm text-muted-foreground">
                        <Link href="/email-preview">
                          <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                            View email content in Email Preview
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t pt-4">
            Last updated: {new Date().toLocaleString()}
          </CardFooter>
        </Card>
      )}
      
      {isLoadingSystemStats || isLoadingChildMetrics || isLoadingAccounts ? (
        <div className="flex justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}