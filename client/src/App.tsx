import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Attendance from "@/pages/Attendance";
import AttendanceManagement from "@/pages/AttendanceManagement";
import Payroll from "@/pages/Payroll";
import Reports from "@/pages/Reports";
import Leaves from "@/pages/Leaves";
import Indemnity from "@/pages/Indemnity";
import SalaryHistory from "@/pages/SalaryHistory";
import FoodMoney from "@/pages/FoodMoney";
import Login from "@/pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/attendance-management" component={AttendanceManagement} />
      <Route path="/payroll" component={Payroll} />
      <Route path="/leaves" component={Leaves} />
      <Route path="/indemnity" component={Indemnity} />
      <Route path="/reports" component={Reports} />
      <Route path="/salary-history" component={SalaryHistory} />
      <Route path="/food-money" component={FoodMoney} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status only once on mount
    async function checkAuth() {
      // Skip auth check if already on login page
      if (location === "/login") {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setLocation("/login");
        }
      } catch (error) {
        setIsAuthenticated(false);
        setLocation("/login");
      }
    }
    
    checkAuth();
  }, []); // Empty dependency array - only run once on mount

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show loading or nothing while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show login page without sidebar
  if (!isAuthenticated || location === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show authenticated layout with sidebar
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
