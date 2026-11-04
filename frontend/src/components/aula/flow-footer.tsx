import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export function FlowFooter({
  backHref,
  backLabel = 'Atrás',
  nextHref,
  nextLabel,
  nextDisabled = false,
  nextHint,
}: {
  backHref: string;
  backLabel?: string;
  nextHref: string;
  nextLabel: string;
  nextDisabled?: boolean;
  nextHint?: string | null;
}) {
  return (
    <div className="mt-8 flex flex-col gap-2">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={backHref}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'h-10 px-4'
          )}
        >
          {backLabel}
        </Link>
        {nextDisabled ? (
          <span
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-10 cursor-not-allowed px-4 opacity-50'
            )}
            aria-disabled="true"
          >
            {nextLabel}
          </span>
        ) : (
          <Link
            to={nextHref}
            className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4')}
          >
            {nextLabel}
          </Link>
        )}
      </div>
      {nextDisabled && nextHint ? (
        <p className="text-right text-xs text-muted-foreground">{nextHint}</p>
      ) : null}
    </div>
  );
}
