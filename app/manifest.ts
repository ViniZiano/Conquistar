import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Conquistar",
    short_name: "Conquistar",
    description: "Conquistar — cuidado, acolhimento e acompanhamento em saúde.",
    start_url: "/",
    display: "standalone",
    background_color: "#effafa",
    theme_color: "#087f87",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
