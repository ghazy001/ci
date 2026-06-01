import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Test Automation',
  description: 'Admin dashboard for authentication and user management',
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en">
      <body>
      {children}
      <Toaster richColors position="top-right" />
      </body>
      </html>
  );
}