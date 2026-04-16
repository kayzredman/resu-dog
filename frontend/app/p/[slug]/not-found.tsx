import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <PawPrint className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">Profile not found</h2>
      <p className="text-sm text-foreground-muted mb-6 max-w-sm">
        This profile link may have expired or doesn&apos;t exist.
        Shared profiles are available for 90 days.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        Go to Resu-Dog →
      </Link>
    </div>
  );
}
