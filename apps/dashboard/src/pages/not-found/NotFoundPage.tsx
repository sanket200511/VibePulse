import { Link } from "react-router-dom";
import { Button } from "@vibepulse/ui";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Button variant="secondary" asChild>
        <Link to="/">Go home</Link>
      </Button>
    </main>
  );
}
