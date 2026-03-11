import type { Metadata } from "next";
import ThemeInitializer from "./components/ThemeInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "HikeUp | Rutas y entrenamiento inteligentes",
  description:
    "Mapas con navegación tipo Waze, rutinas personalizadas y comunidad bilingüe para correr, trotar o caminar en América.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
