'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore } from '@/store/user-store';
import { initializeFirebase } from '@/lib/firebase-config';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth, isLoading } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Firebase on mount
    initializeFirebase();

    // Check authentication status
    checkAuth().then(() => {
      setIsInitialized(true);
    });
  }, [checkAuth]);

  useEffect(() => {
    // Don't redirect if still initializing
    if (!isInitialized) {
      return;
    }

    // Allow access to login page without authentication
    if (pathname === '/login') {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitialized, pathname, router]);

  // Show loading state while checking auth
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-editor-accent/30 border-t-editor-accent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xl font-bold text-editor-fg">Loading...</div>
        </div>
      </div>
    );
  }

  // If on login page, always show it
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show content only if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}
