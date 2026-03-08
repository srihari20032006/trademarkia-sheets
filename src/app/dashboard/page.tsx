"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  listDocumentsByUser,
  createDocument,
} from "@/lib/firebase/documents";
import { signOut } from "@/lib/firebase/auth";
import type { DocumentMeta } from "@/types";

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const list = await listDocumentsByUser(user.uid);
      setDocs(list);
    } finally {
      setLoadingDocs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchDocs();
  }, [user, fetchDocs]);

  async function handleCreate() {
    if (!user || creating) return;
    setCreating(true);
    try {
      const id = await createDocument(
        user.uid,
        user.displayName ?? "Unknown",
        "Untitled Spreadsheet"
      );
      router.push(`/editor/${id}`);
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
              <path d="M3 3h18v18H3V3zm2 2v4h5V5H5zm7 0v4h5V5h-5zm-7 6v4h5v-4H5zm7 0v4h5v-4h-5zm-7 6v2h5v-2H5zm7 0v2h5v-2h-5z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Sheets</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user.displayName ?? user.email}
          </span>
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">My Spreadsheets</h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {creating ? "Creating…" : "New spreadsheet"}
          </button>
        </div>

        {loadingDocs ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-gray-600 font-medium mb-1">No spreadsheets yet</h2>
            <p className="text-gray-400 text-sm mb-4">
              Create your first spreadsheet to get started.
            </p>
            <button
              onClick={handleCreate}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Create spreadsheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => router.push(`/editor/${d.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow group animate-fade-in"
              >
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-green-50 to-green-100 rounded-lg mb-3 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 text-green-600 opacity-60"
                    fill="currentColor"
                  >
                    <path d="M3 3h18v18H3V3zm2 2v4h5V5H5zm7 0v4h5V5h-5zm-7 6v4h5v-4H5zm7 0v4h5v-4h-5zm-7 6v2h5v-2H5zm7 0v2h5v-2h-5z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {d.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Modified {formatDate(d.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
