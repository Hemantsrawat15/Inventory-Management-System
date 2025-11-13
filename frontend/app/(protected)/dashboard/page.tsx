"use client";

import { useAuth } from '@/providers/GlobalProvider';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      <p className="mt-2 text-lg text-gray-600">
        Welcome back, <span className="font-semibold text-blue-600">{user?.name || 'User'}</span>!
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card for Cropper Tool */}
        <Link href="/cropper" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition-colors">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">✂️ Label Cropper</h5>
          <p className="font-normal text-gray-700">Visually crop shipping labels and download the new PDF.</p>
        </Link>
        
        {/* Card for Profile */}
        <Link href="/profile" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition-colors">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">👤 User Profile</h5>
          <p className="font-normal text-gray-700">Manage your business accounts and GSTIN information.</p>
        </Link>

        {/* Placeholder Card for Inventory */}
        <Link href="/inventory" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition-colors">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">📦 Inventory</h5>
          <p className="font-normal text-gray-700">View and manage your product stock levels.</p>
        </Link>

      </div>

      {/* You can add your dashboard stats here later */}
      <div className="mt-10 p-6 bg-white border rounded-lg">
        <h2 className="text-xl font-bold">Store Analytics</h2>
        <p className="mt-4 text-gray-500">Your sales data and inventory statistics will be displayed here soon.</p>
      </div>

    </div>
  );
}