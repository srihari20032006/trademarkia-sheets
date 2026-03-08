"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signInAsGuest } from "@/lib/firebase/auth";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [mode, setMode] = useState<"choose" | "guest">("choose");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuest() {
    if (!guestName.trim()) {
      setError("Please enter a display name.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signInAsGuest(guestName.trim());
      router.replace("/dashboard");
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M3 3h18v18H3V3zm2 2v4h5V5H5zm7 0v4h5V5h-5zm-7 6v4h5v-4H5zm7 0v4h5v-4h-5zm-7 6v2h5v-2H5zm7 0v2h5v-2h-5z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900">Sheets</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === "choose" ? "Get started" : "Choose a display name"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {mode === "choose"
            ? "Sign in to create and collaborate on spreadsheets."
            : "This is how others will see you in shared documents."}
        </p>

        {mode === "choose" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={() => setMode("guest")}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Continue as guest
            </button>
          </div>
        )}

        {mode === "guest" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your display name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGuest()}
              maxLength={30}
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              onClick={handleGuest}
              disabled={submitting || !guestName.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? "Signing in…" : "Continue"}
            </button>
            <button
              onClick={() => setMode("choose")}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
