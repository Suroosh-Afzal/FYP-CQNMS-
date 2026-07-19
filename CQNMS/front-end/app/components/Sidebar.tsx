"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation'; // searchParams add kiya

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Current URL se intensity uthayega taake link mein bhej sakay
  const currentIntensity = searchParams.get('intensity') || '1000';

  const navItems = [
    { name: 'Live Dashboard', path: '/', icon: '🌐' },
    { name: 'Algo Arena', path: '/arena', icon: '📊' },
    { name: 'Innovation Vault', path: '/innovation', icon: '💡' },
    { name: 'Reports', path: '/reports', icon: '📁' },
  ];

  return (
    <div className={`relative bg-black h-screen p-6 text-white transition-all duration-300 border-r border-white/10 z-50 ${isExpanded ? 'w-72' : 'w-20'}`}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="absolute -right-3 top-10 bg-white text-black border border-slate-200 rounded-full p-1 shadow-md hover:scale-110 transition-transform">
        {isExpanded ? '❮' : '❯'}
      </button>

      <div className={`mb-12 flex items-center gap-3 overflow-hidden ${!isExpanded && 'justify-center'}`}>
        <div className="min-w-[32px] h-8 bg-white text-black font-black flex items-center justify-center rounded-lg text-sm italic">C</div>
        {isExpanded && <h2 className="text-xl font-black tracking-tighter text-white italic">CQNMS</h2>}
      </div>

      <nav className="flex flex-col gap-4">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            // Yahan magic hai: Intensity ko link ke sath attach kar raha hai
            href={`${item.path}?intensity=${currentIntensity}`} 
            className={`flex items-center rounded-xl text-xs font-black uppercase transition-all ${
              pathname === item.path ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            } ${isExpanded ? 'px-5 py-4 gap-4' : 'p-4 justify-center'}`}
          >
            <span className="text-lg">{item.icon}</span>
            {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}