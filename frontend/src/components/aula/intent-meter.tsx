export function IntentMeter({
  remaining,
  total = 5,
}: {
  remaining: number;
  total?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={
            index < remaining
              ? 'h-1.5 w-4 rounded-full bg-primary'
              : 'h-1.5 w-4 rounded-full bg-primary/15'
          }
        />
      ))}
    </span>
  );
}
