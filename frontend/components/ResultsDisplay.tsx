'use client';
import { ParseResponse } from '@/lib/types';

interface ResultsDisplayProps {
  data: ParseResponse | null;
}

export default function ResultsDisplay({ data }: ResultsDisplayProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No data yet. Upload a PDF to see extracted labels.</p>
      </div>
    );
  }

  const { fileName, numPages, totalLabels, validLabels, labels, errors } = data;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Parsing Results</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">File Name</div>
            <div className="text-lg font-bold text-blue-900 truncate" title={fileName}>
              {fileName}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Pages</div>
            <div className="text-lg font-bold text-green-900">{numPages}</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Total Labels</div>
            <div className="text-lg font-bold text-purple-900">{totalLabels}</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 font-medium">Valid Labels</div>
            <div className="text-lg font-bold text-orange-900">{validLabels}</div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Some labels had issues:</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {errors.map((err, idx) => (
              <li key={idx}>Label {err.labelNumber}: {err.errors.join(', ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-xl font-bold">Extracted Data (4 Key Fields)</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Partner</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {labels && labels.length > 0 ? (
                labels.map((label) => (
                  <tr key={label.labelNumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{label.labelNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{label.sku || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{label.orderId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">{label.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        label.deliveryPartner === 'Unknown' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {label.deliveryPartner}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No labels found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}