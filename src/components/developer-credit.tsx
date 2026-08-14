export function DeveloperCredit({
  variant = "default",
}: {
  variant?: "default" | "nav";
}) {
  return (
    <p className={`developer-credit${variant === "nav" ? " nav" : ""}`}>
      Software by <strong>Bessatech</strong>
    </p>
  );
}
