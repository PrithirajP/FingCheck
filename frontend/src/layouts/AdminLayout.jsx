import { useEffect } from "react";
import { UserButton } from "@clerk/clerk-react";
import { Activity, Users, Database, Layers, ShieldAlert, SplitSquareHorizontal } from "lucide-react";

export default function AdminLayout({ children, activeTab, setActiveTab }) {
  // The 5 core views defined in the specification
  const navItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "User Management", icon: Users },
    { id: "targets", label: "Target Database", icon: Database },
    { id: "analysis", label: "Overlap Analysis", icon: Layers },
    { id: "audit", label: "Audit & Security Logs", icon: ShieldAlert },
  ];

  useEffect(() => {
    const validTabs = navItems.map((n) => n.id);
    if (!validTabs.includes(activeTab) && activeTab !== "admin") {
      setActiveTab("overview");
    }
  }, [activeTab, setActiveTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col">
        <div className="mb-8 px-2 mt-2">
          <span className="text-xl font-black tracking-wider text-amber-500 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" />
            ADMIN COMMAND
          </span>
        </div>

        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Launch into User Pipeline Workspace */}
        <div className="pt-4 border-t border-slate-800">
          <a
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all"
          >
            <SplitSquareHorizontal className="w-5 h-5" />
            User Workspace Portal
          </a>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0f1c]">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8">
          <div className="text-sm font-mono text-slate-500">
            Secure Session Active // {new Date().toISOString().split("T")[0]}
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "w-9 h-9 border-2 border-amber-500/50" },
            }}
          />
        </header>
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
