import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../src/lib/QueryProvider';

export const metadata: Metadata = {
  title: 'Ilusa Operations',
  description: 'Marketing Ops Workspace — Dashboard internal tim Ilusa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
