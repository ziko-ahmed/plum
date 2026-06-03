import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plum Claims",
  description: "OPD claim adjudication tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="container nav-inner">
            <Link href="/" className="nav-brand">
              plum claims
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">
                Dashboard
              </Link>
              <Link href="/submit" className="nav-link active">
                New Claim
              </Link>
            </div>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
