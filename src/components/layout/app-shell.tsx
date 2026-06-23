import { type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Stethoscope,
  BarChart3,
  Database,
  BrainCircuit,
  UserRound,
  FileText,
  Settings,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  HeartPulse,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth-context";
import { HelpButton } from "@/components/help-button";

type NavItem = {
  title: string;
  url: "/dashboard" | "/predict" | "/analytics" | "/datasets" | "/models" | "/patients" | "/reports" | "/settings";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Disease Prediction", url: "/predict", icon: Stethoscope, badge: "Core" },
  { title: "EDA & Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Dataset Manager", url: "/datasets", icon: Database },
  { title: "Model Performance", url: "/models", icon: BrainCircuit },
  { title: "Patient Records", url: "/patients", icon: UserRound },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

function initials(name?: string | null) {
  if (!name) return "U";
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold">HealthPredict</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Clinical AI Suite
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                  {initials(profile?.full_name ?? user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden leading-tight">
                <p className="truncate text-xs font-semibold">
                  {profile?.full_name || user?.email || "User"}
                </p>
                <p className="truncate text-[10px] capitalize text-muted-foreground">
                  {profile?.role ?? "user"}
                  {profile?.institution ? ` · ${profile.institution}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function Breadcrumb() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const current = navItems.find((i) => pathname === i.url || pathname.startsWith(i.url + "/"));
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
        HealthPredict
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{current?.title ?? "Page"}</span>
    </nav>
  );
}

function TopBar() {
  const { theme, toggle } = useTheme();
  const { profile, user } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden md:block"><Breadcrumb /></div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <div className="ml-1 flex items-center gap-2.5 rounded-full border bg-background py-1 pl-1 pr-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {initials(profile?.full_name ?? user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight md:block">
            <p className="text-xs font-semibold">{profile?.full_name || user?.email}</p>
            <p className="text-[10px] capitalize text-muted-foreground">{profile?.role ?? "user"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card/50 px-6 py-4">
      <div className="flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground md:flex-row md:items-center">
        <p>
          <span className="font-semibold text-foreground">HealthPredict</span> · AI-Based Smart
          Healthcare Disease Prediction System
        </p>
        <p>
          <span className="italic">[Institution Name]</span> · v1.0.0 · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "280px",
        "--sidebar-width-icon": "64px",
      } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          <Footer />
        </div>
        <HelpButton />
      </div>
    </SidebarProvider>
  );
}
