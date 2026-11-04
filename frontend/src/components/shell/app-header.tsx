import { Link } from 'react-router-dom';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 text-sm">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground"
          >
            V
          </span>
          <span className="truncate font-semibold tracking-tight">
            Aula Virtual
          </span>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <span className="truncate text-muted-foreground">
            Accesibilidad de materiales
          </span>
        </Link>
      </div>
    </header>
  );
}
