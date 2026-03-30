'use client';

import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/user-store';
import { LogOut, User, Settings } from 'lucide-react';

interface LogoutButtonProps {
  wpmStatusMessage?: string | null;
  onWpmClick?: () => void;
}

export function LogoutButton({ wpmStatusMessage, onWpmClick }: LogoutButtonProps) {
  const router = useRouter();
  const { displayName, wpmScore, logout } = useUserStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="flex items-center gap-4">
      {/* Display Name with optional WPM Score */}
      <div className="relative group">
        {onWpmClick ? (
          <button
            onClick={onWpmClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-editor-muted/30 rounded-lg hover:bg-editor-muted/50 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-editor-accent" />
            <span className="text-sm font-medium text-editor-fg">{displayName}</span>
            <span className="text-sm text-editor-accent font-bold">
              {wpmScore !== null ? `${wpmScore} WPM` : 'Set WPM'}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-editor-muted/30 rounded-lg">
            <User className="w-4 h-4 text-editor-accent" />
            <span className="text-sm font-medium text-editor-fg">
              {displayName}
              {wpmScore !== null && (
                <span className="ml-2 text-editor-accent font-bold">{wpmScore} WPM</span>
              )}
            </span>
          </div>
        )}

        {/* Tooltip for WPM status */}
        {wpmStatusMessage && (
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            {wpmStatusMessage}
          </div>
        )}
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
