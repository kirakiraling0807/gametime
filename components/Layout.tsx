import React from 'react';
import { User, Page } from '../types';
import { Calendar, Settings, PieChart, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  currentPage, 
  onNavigate, 
  onLogout 
}) => {
  if (!currentUser) {
    return <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">{children}</div>;
  }

  const NavItem = ({ page, icon: Icon, label, isMobile = false }: { page: Page; icon: any; label: string, isMobile?: boolean }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`
        flex items-center justify-center gap-2 transition-all font-bold rounded-2xl
        ${isMobile 
          ? 'flex-col p-2 text-xs flex-1 h-full' 
          : 'flex-row px-4 py-3 w-full text-left mb-2 text-base'
        }
        ${currentPage === page 
          ? 'text-brand-600 bg-brand-50' 
          : 'text-gray-400 hover:text-brand-400 hover:bg-white'
        }
      `}
    >
      <Icon size={isMobile ? 24 : 22} strokeWidth={2.5} className={currentPage === page ? "drop-shadow-sm" : ""} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col md:flex-row text-slate-800 font-sans">
      
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex w-64 bg-cream-100/80 backdrop-blur-md border-r border-slate-200 p-6 flex-col justify-between shrink-0 sticky top-0 h-screen z-10">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-xl shadow-md text-white">
              🎮
            </div>
            <h1 className="text-xl font-extrabold text-slate-700 tracking-wide">
              遊戲時間統計
            </h1>
          </div>

          <div className="flex items-center gap-3 mb-8 p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-opacity-20"
              style={{ backgroundColor: currentUser.color + '40' }} 
            >
              {currentUser.emoji}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Hello</p>
              <p className="font-bold text-lg truncate text-slate-700">{currentUser.name}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem page="SCHEDULE" icon={Calendar} label="時間填寫" />
            <NavItem page="STATS" icon={PieChart} label="統計報表" />
            <NavItem page="SETTINGS" icon={Settings} label="個人設定" />
          </nav>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-50 hover:text-red-400 rounded-2xl transition-colors font-bold"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span>登出</span>
        </button>
      </aside>

      {/* ================= MOBILE HEADER ================= */}
      <header className="md:hidden bg-cream-100/90 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-lg text-white shadow-sm">
              🎮
            </div>
            <h1 className="font-extrabold text-slate-700">遊戲時間統計</h1>
         </div>
         <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-brand-50">
            <span className="text-xl">{currentUser.emoji}</span>
            <span className="font-bold text-sm text-slate-600 max-w-[80px] truncate">{currentUser.name}</span>
         </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      {/* Added pb-24 for mobile bottom nav spacing */}
      <main className="flex-1 overflow-y-auto min-h-[calc(100vh-60px)] md:h-screen p-4 md:p-8 bg-cream-50 pb-28 md:pb-8">
        <div className="max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] pb-safe">
         <NavItem page="SCHEDULE" icon={Calendar} label="填寫" isMobile />
         <NavItem page="STATS" icon={PieChart} label="統計" isMobile />
         <NavItem page="SETTINGS" icon={Settings} label="設定" isMobile />
         <button 
           onClick={onLogout}
           className="flex flex-col items-center justify-center p-2 text-xs flex-1 h-full text-gray-400 hover:text-red-400 transition-colors font-bold rounded-2xl"
         >
           <LogOut size={24} strokeWidth={2.5} />
           <span>登出</span>
         </button>
      </nav>
    </div>
  );
};