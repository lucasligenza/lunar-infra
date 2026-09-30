import type { Metadata } from "next";
import "ol/ol.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LunarOS | South-pole data explorer",
  description: "Explore NASA LOLA elevation, derived terrain slope and modeled lunar solar visibility.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
