import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "무지개빛 미술학원 | The Rainbow Atelier",
  description: "귀여움과 기괴함이 교차하는 2D 픽셀 심리 공포 웹게임",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
