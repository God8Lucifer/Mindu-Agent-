import type { Metadata, Viewport } from "next";
import { Lato, Lora } from "next/font/google";
import "./globals.css";

// Lato is the typeface used on gmc.bt.
const lato = Lato({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "700", "900"] });
// Lora matches the serif headings in the Experience Centre visuals.
const lora = Lora({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "GMC — Your Experience Centre journey",
  description: "A personalised journey through the GMC Experience Centre.",
};

export const viewport: Viewport = {
  themeColor: "#2d3a2b",
};

// Same light/dark choice as the Mindu agent (public/agent): saved in localStorage
// under "mindu-theme", otherwise the device setting. Runs before first paint.
const themeScript = `(function(){try{var t=localStorage.getItem('mindu-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
