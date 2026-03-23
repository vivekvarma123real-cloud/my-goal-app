import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeStack",
  description: "Plan Goals. Build Habits. Transform Your Life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        <script dangerouslySetInnerHTML={{__html:`const _ce=console.error.bind(console);console.error=(...a)=>{if(a[0]?.name==="AbortError"||String(a[0]).includes("Lock broken"))return;_ce(...a)};`}}/>
        {children}
      </body>
    </html>
  );
}