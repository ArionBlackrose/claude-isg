export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
        role="status"
        aria-label="Yükleniyor"
      />
    </div>
  );
}
