import { Suspense } from 'react';
import Sidebar from './components/Sidebar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex bg-[#f8fafc] h-screen overflow-hidden">
        {/* Wrapped in Suspense so useSearchParams in Sidebar/children doesn't fail the build */}
        <Suspense fallback={<div className="h-screen w-20 bg-black animate-pulse" />}>
          <Sidebar /> 
        </Suspense>
        
        <main className="flex-1 overflow-y-auto relative">
          <Suspense fallback={<div className="p-10 font-black uppercase italic opacity-20">Loading CQNMS Core...</div>}>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}