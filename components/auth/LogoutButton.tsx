'use client';

import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/user-store';
import { LogOut, User } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const { displayName, logout } = useUserStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-4">
      {/* Display Name */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-editor-muted/30 rounded-lg">
        <User className="w-4 h-4 text-editor-accent" />
        <span className="text-sm font-medium text-editor-fg">{displayName}</span>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 bg-editor-bg-alt border border-editor-muted
                   hover:bg-editor-muted/30 text-editor-fg rounded-lg transition-colors"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Logout</span>
      </button>
    </div>
  );
}
