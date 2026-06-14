import { Configurator } from "@/components/Configurator";
import { getVehicle } from "@/lib/api";

export default async function ConfiguratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getVehicle(id);
  return <Configurator initial={project} />;
}

