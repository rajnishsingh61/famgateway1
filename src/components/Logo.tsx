import { BRAND_LOGO_URL } from "@/lib/brand";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${className}`}>
      <img
        src={BRAND_LOGO_URL}
        alt="ZapGateway logo"
        className="size-8 rounded-lg object-contain ring-1 ring-primary/30"
        loading="lazy"
      />
      <span className="text-lg">
        Zap<span className="text-gradient">Gateway</span>
      </span>
    </span>
  );
}
