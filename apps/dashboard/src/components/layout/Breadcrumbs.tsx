import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-secondary-text mb-3 flex flex-wrap items-center gap-1.5 text-xs"
    >
      <Link
        to="/"
        className="hover:text-primary-text inline-flex items-center gap-1 font-medium transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only">Workspace</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight
              className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-primary-text max-w-[200px] truncate font-medium transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-primary-text max-w-[240px] truncate font-semibold"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
