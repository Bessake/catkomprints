import Link from "next/link";
import { ClientForm } from "@/components/client-form";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>New client</h1>
        </div>
        <Link href="/clients" className="button secondary">
          Back
        </Link>
      </div>
      <section className="panel">
        <ClientForm />
      </section>
    </>
  );
}
