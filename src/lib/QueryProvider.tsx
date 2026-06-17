'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Buat satu QueryClient per session (bukan di module level agar SSR-safe)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 1 menit — tidak re-fetch kalau pindah tab
            staleTime: 60 * 1000,
            // Kalau error, retry maksimal 1x
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
