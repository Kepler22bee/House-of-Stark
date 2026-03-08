import type { Metadata } from "next";
import "./globals.css";
import StarknetProvider from "../dojo/StarknetProvider";

export const metadata: Metadata = {
  title: "Fortune Falls - Casino RPG",
  description: "A top-down pixel art casino RPG on Starknet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StarknetProvider>{children}</StarknetProvider>
      </body>
    </html>
  );
}
