import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Архитектура ПО — учебный курс",
  description: "Материалы курса, навигация по главам и сохранение прогресса",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
