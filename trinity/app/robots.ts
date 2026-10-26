import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// Les espaces privés (back-office, compte, panier, connexion) et l'API ne sont pas à explorer
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/user", "/cart", "/auth"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
