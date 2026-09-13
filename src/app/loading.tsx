export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400"
      />
    </div>
  );
}
