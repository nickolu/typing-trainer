'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/user-store';
import { Keyboard } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isAuthenticated, isLoading, error, clearError } = useUserStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    let success = false;
    if (mode === 'login') {
      success = await login(email.trim(), password);
    } else {
      success = await signup(email.trim(), password, displayName.trim());
    }

    if (success) {
      router.push('/');
    } else {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    clearError();
  };

  // Show loading state during redirect after successful authentication
  if (isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-editor-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-editor-accent/30 border-t-editor-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-editor-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-editor-bg">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-editor-accent/20 rounded-full mb-4">
            <Keyboard className="w-8 h-8 text-editor-accent" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Typing Trainer</h1>
          <p className="text-editor-muted">
            Improve your typing speed and accuracy
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg
                           placeholder-editor-muted/60
                           focus:outline-none focus:ring-2 focus:ring-editor-accent focus:border-transparent
                           transition-all"
                  disabled={isLoading || isSubmitting}
                  autoFocus={mode === 'signup'}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-editor-bg-alt border border-editor-muted rounded-lg
                         placeholder-editor-muted/60
                         focus:outline-none focus:ring-2 focus:ring-editor-accent focus:border-transparent
                         transition-all"
                disabled={isLoading || isSubmitting}
                autoFocus={mode === 'login'}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                className="w-full px-4 py-3 bg-editor-bg-alt border border-editor-muted rounded-lg
                         placeholder-editor-muted/60
                         focus:outline-none focus:ring-2 focus:ring-editor-accent focus:border-transparent
                         transition-all"
                disabled={isLoading || isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                !email.trim() ||
                !password ||
                (mode === 'signup' && !displayName.trim()) ||
                isLoading ||
                isSubmitting
              }
              className="w-full px-6 py-3 bg-editor-accent hover:bg-editor-accent/80
                       text-white rounded-lg font-medium transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isLoading || isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                </>
              ) : (
                mode === 'login' ? 'Log In' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 pt-6 border-t border-editor-muted text-center">
            <p className="text-sm text-editor-muted">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={toggleMode}
                className="text-editor-accent hover:underline font-medium"
                disabled={isLoading || isSubmitting}
              >
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-editor-muted mt-6">
          Built with Next.js, TypeScript, and Firebase
        </p>
      </div>
    </div>
  );
}
