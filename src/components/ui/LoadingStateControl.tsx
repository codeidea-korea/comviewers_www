export function LoadingState({ className = '', label }: { className?: string; label: string }) {
  return (
    <div aria-live="polite" className={`route-loading ${className}`.trim()} role="status">
      <span aria-hidden="true" className="route-loading__indicator" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
