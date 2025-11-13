"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// =================== THE FIX IS HERE ===================
// Import useAuth from the single, correct GlobalProvider file.
import { useAuth } from '@/providers/GlobalProvider';
// =======================================================
import SideBar from '@/components/SideBar'; // Assuming your sidebar is here

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Now, this call to useAuth() will work because it's looking for the context
  // provided by GlobalProvider in the root layout.
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the authentication check is finished and the user is NOT logged in,
    // redirect them to the login page.
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]); // This effect runs when these values change

  // While we are checking for authentication, show a loading state.
  // This also prevents a "flash" of the protected content before redirecting.
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If the user is authenticated, render the main application layout
  // with the sidebar and the page content.
  return (
    <div className="flex h-screen bg-gray-100">
      <SideBar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children} {/* This renders the actual page (e.g., /dashboard, /cropper) */}
      </main>
    </div>
  );
}