import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi Photo Change Date",
  description: "Локальное пакетное изменение даты съёмки фотографий и видео.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
