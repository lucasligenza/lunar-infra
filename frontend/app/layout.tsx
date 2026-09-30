import type { Metadata } from "next";
import "ol/ol.css";
import "./globals.css";
import "./exploration.css";

export const metadata: Metadata = {
  title: "LunarOS | Lunar exploration and mission design",
  description: "Explore the Moon in 3D with NASA imagery, validated lunar terrain and hypothetical infrastructure simulations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
