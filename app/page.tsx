import type { Metadata } from "next";
import { PublicLanding } from "@/components/PublicLanding";

export const metadata: Metadata = {
  title: "Conquistar | Cuidado e atenção em saúde",
  description:
    "Conheça a Conquistar. Um espaço de cuidado, acolhimento e acompanhamento em saúde.",
};

export default function HomePage() {
  return <PublicLanding />;
}
