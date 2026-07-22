import { UserButton } from '@clerk/clerk-react';
import { LayoutDashboard, Sliders, CheckSquare, ShieldAlert, Fingerprint } from 'lucide-react';

export default function DashboardLayout({ children, activeTab, setActiveTab }) {
 const navItems = [
    { id: 'separation', label: 'Fingerprint Pipeline', icon: Sliders },
  ];
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4">
        <div className="mb-8 px-2">
          <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-400 flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-cyan-400" />
            FINGCHECK
          </span>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <a
              href="/admin/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition"
            >
              <ShieldAlert className="w-4 h-4" /> Admin Command Center
            </a>
          </div>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}