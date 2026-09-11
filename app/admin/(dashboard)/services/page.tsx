import { PageHeader } from "@/components/admin/page-header";
import { getServices } from "@/lib/queries/admin";
import { ServiceManager } from "./service-manager";

export const metadata = { title: "What I offer" };

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <PageHeader
        title="What I offer"
        description="The services a visitor can hire you for — website builds, apps, internal systems. Drag to reorder; the first card is what people read first."
      />
      <ServiceManager services={services} />
    </>
  );
}
