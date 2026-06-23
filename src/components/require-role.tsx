import { ShieldOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { canAccess, type RoutePath } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  path: RoutePath;
  children: React.ReactNode;
};

export function RequireRole({ path, children }: Props) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (canAccess(profile?.role, path)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <ShieldOff className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Access restricted</h2>
          <p className="text-sm text-muted-foreground">
            Your role <strong className="capitalize">{profile?.role ?? "user"}</strong> doesn't have
            permission to view this page. Contact an administrator if you believe this is a mistake.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
