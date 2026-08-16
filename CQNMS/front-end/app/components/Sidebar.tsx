"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Read intensity from the current URL so it can be forwarded to nav links
  const currentIntensity = searchParams.get('intensity') || '1000';

  const navItems = [
    { name: 'Live Dashboard', path: '/', icon: '🌐' },
    { name: 'Algo Arena', path: '/arena', icon: '📊' },
    { name: 'Innovation Vault', path: '/innovation', icon: '💡' },
    { name: 'Reports', path: '/reports', icon: '📁' },
  ];

  return (
    <div className={`relative bg-surface-2 h-screen p-4 text-text transition-all duration-300 border-r border-border z-50 ${isExpanded ? 'w-64' : 'w-20'}`}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="absolute -right-3 top-9 bg-surface text-text-muted border border-border rounded-full p-1 shadow-sm hover:text-text hover:scale-105 transition-all">
        {isExpanded ? '❮' : '❯'}
      </button>

      <div className={`mb-8 flex items-center gap-3 overflow-hidden px-2 pt-2 ${!isExpanded && 'justify-center'}`}>
        <div className="min-w-[32px] h-8 bg-accent text-accent-foreground font-semibold flex items-center justify-center rounded-lg text-sm">C</div>
        {isExpanded && <h2 className="text-base font-semibold tracking-tight text-text">CQNMS</h2>}
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            // Carry the current intensity along so it persists across page navigation
            href={`${item.path}?intensity=${currentIntensity}`}
            className={`flex items-center rounded-lg text-sm font-medium transition-all ${
              pathname === item.path ? 'bg-accent text-accent-foreground' : 'text-text-muted hover:bg-surface hover:text-text'
            } ${isExpanded ? 'px-4 py-2.5 gap-3' : 'p-3 justify-center'}`}
          >
            <span className="text-base">{item.icon}</span>
            {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}