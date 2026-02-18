import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trucker'sCall - Fleet Management System",
  description: "Manage your fleet of vehicles and drivers efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster
          theme="dark"
          visibleToasts={5}
          toastOptions={{
            style: {
              background: '#09090b', // zinc-950
              color: '#ffffff',
              border: '1px solid #27272a', // zinc-800
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.875rem',
            },
            classNames: {
              toast: 'group toast group-[.toaster]:bg-zinc-950 group-[.toaster]:text-white group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-2xl',
              description: 'group-[.toast]:text-zinc-300 group-[.toast]:text-xs font-light', // zinc-300 is very light gray/white-ish
              actionButton: 'group-[.toast]:bg-white group-[.toast]:text-black',
              cancelButton: 'group-[.toast]:bg-zinc-800 group-[.toast]:text-white',
            },
          }}
        />
      </body>
    </html>
  );
}
