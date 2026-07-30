import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ФотоДата — редактор даты съёмки",
  description: "Удобное локальное изменение даты съёмки у нескольких фотографий.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
