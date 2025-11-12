'use client';
import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import { ParseResponse } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<ParseResponse | null>(null);

  const handleSuccess = (data: ParseResponse): void => {
    setResults(data);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 PDF Label Parser</h1>
          <p className="text-gray-600">Extract SKU, Order ID, Quantity, and Delivery Partner from shipping labels</p>
        </div>

        <div className="mb-8">
          <UploadForm onSuccess={handleSuccess} />
        </div>

        <ResultsDisplay data={results} />
      </div>
    </main>
  );
}