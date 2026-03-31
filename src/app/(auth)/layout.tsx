export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          STEP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          毎日1STEP、チームが強くなる。
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
