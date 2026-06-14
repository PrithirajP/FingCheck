import { UserButton } from '@clerk/clerk-react';
import { LayoutDashboard, Sliders, CheckSquare, ShieldAlert } from 'lucide-react';

export default function DashboardLayout({ children, activeTab, setActiveTab }) {
 const navItems = [
    { id: 'separation', label: 'Fingerprint Pipeline', icon: Sliders },
    { id: 'matching', label: '1-to-1 Verification', icon: CheckSquare }, // Changed label
    { id: 'admin', label: 'Admin Logs', icon: ShieldAlert },
  ];
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4">
        <div className="mb-8 px-2">
          <span className="text-xl font-black tracking-wider text-indigo-400">FINGCHECK</span>
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
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 flex items-center justify-end px-8">
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}