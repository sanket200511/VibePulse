import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <p className="text-muted-foreground text-6xl font-bold">404</p>
      <h1 className="text-foreground text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center rounded-[12px] px-4 text-sm font-medium transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
