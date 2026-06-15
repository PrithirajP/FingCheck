import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminService, setAuthToken } from '../../services/api';
import { ShieldAlert, Trash2, Shield, User, Loader2 } from 'lucide-react';

export default function UserManagement() {
  const { getToken } = useAuth(); // Grab Clerk auth function
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // 1. Get the token and attach it to the API
      const token = await getToken();
      setAuthToken(token);
      
      // 2. Fetch the data
      const data = await adminService.getAllUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = await getToken();
      setAuthToken(token);
      await adminService.updateRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert("Failed to update role.");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const token = await getToken();
      setAuthToken(token);
      await adminService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      alert("Failed to delete user.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
        <p className="text-slate-400 text-sm">Modify clearance roles and manage platform access.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">User Profile</th>
              <th className="p-4 font-medium">System Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {isLoading ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-medium">No users found in database.</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${
                      user.role === 'admin' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    <option value="user" className="bg-slate-900 text-white">Standard User</option>
                    <option value="admin" className="bg-slate-900 text-white">Administrator</option>
                  </select>
                </td>
                <td className="p-4">
                  <span className="text-xs font-medium px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">Active</span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}