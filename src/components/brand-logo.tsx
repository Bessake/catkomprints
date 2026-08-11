import Image from "next/image";

type BrandLogoProps = {
  variant?: "nav" | "hero" | "header" | "invoice";
  priority?: boolean;
};

const sizes = {
  nav: { width: 148, height: 124, className: "brand-logo brand-logo-nav" },
  hero: { width: 220, height: 186, className: "brand-logo brand-logo-hero" },
  header: { width: 72, height: 60, className: "brand-logo brand-logo-header" },
  invoice: { width: 110, height: 92, className: "brand-logo brand-logo-invoice" },
} as const;

export function BrandLogo({
  variant = "nav",
  priority = false,
}: BrandLogoProps) {
  const size = sizes[variant];
  return (
    <Image
      src="/catkom-logo.png"
      alt="Catkom Prints"
      width={size.width}
      height={size.height}
      className={size.className}
      priority={priority}
      unoptimized
    />
  );
}
