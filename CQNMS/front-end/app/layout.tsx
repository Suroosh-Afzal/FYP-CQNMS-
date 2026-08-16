import { Suspense } from 'react';
import Sidebar from './components/Sidebar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex bg-bg h-screen overflow-hidden">
        {/* Wrapped in Suspense so useSearchParams in Sidebar/children doesn't fail the build */}
        <Suspense fallback={<div className="h-screen w-20 bg-surface-2 animate-pulse" />}>
          <Sidebar />
        </Suspense>

        <main className="flex-1 overflow-y-auto relative">
          <Suspense fallback={<div className="p-10 text-sm text-text-muted">Loading CQNMS…</div>}>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}