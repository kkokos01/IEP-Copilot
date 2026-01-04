'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Document = Database['public']['Tables']['documents']['Row'];

interface BulkDocumentActionsProps {
  selectedDocuments: Document[];
  onClearSelection: () => void;
  onComplete: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'iep', label: 'IEP' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'progress_report', label: 'Progress Report' },
  { value: 'email', label: 'Email' },
  { value: 'meeting_notes', label: 'Meeting Notes' },
  { value: 'prior_written_notice', label: 'Prior Written Notice' },
  { value: 'other', label: 'Other' },
];

export default function BulkDocumentActions({
  selectedDocuments,
  onClearSelection,
  onComplete,
}: BulkDocumentActionsProps) {
  const [showRecategorizeModal, setShowRecategorizeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newType, setNewType] = useState('iep');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const handleBulkRecategorize = async () => {
    setIsLoading(true);
    setError(null);
    setProgress({ completed: 0, total: selectedDocuments.length });

    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedDocuments.length; i++) {
        const doc = selectedDocuments[i];
        try {
          const response = await fetch(`/api/documents/${doc.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: newType }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }

        setProgress({ completed: i + 1, total: selectedDocuments.length });
      }

      if (failCount > 0) {
        setError(`Updated ${successCount} documents, failed ${failCount}`);
      }

      setShowRecategorizeModal(false);
      onComplete();
      onClearSelection();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setProgress({ completed: 0, total: 0 });
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    setError(null);
    setProgress({ completed: 0, total: selectedDocuments.length });

    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedDocuments.length; i++) {
        const doc = selectedDocuments[i];
        try {
          const response = await fetch(`/api/documents/${doc.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }

        setProgress({ completed: i + 1, total: selectedDocuments.length });
      }

      if (failCount > 0) {
        setError(`Deleted ${successCount} documents, failed ${failCount}`);
      }

      setShowDeleteModal(false);
      onComplete();
      onClearSelection();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setProgress({ completed: 0, total: 0 });
    }
  };

  if (selectedDocuments.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk actions bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowRecategorizeModal(true);
                setNewType(selectedDocuments[0]?.type || 'iep');
              }}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-sm font-medium"
            >
              Recategorize All
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Recategorize Modal */}
      {showRecategorizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Recategorize {selectedDocuments.length} Document{selectedDocuments.length !== 1 ? 's' : ''}
            </h3>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Document Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {isLoading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(progress.completed / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Processing {progress.completed} of {progress.total}...
                </p>
              </div>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRecategorizeModal(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRecategorize}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Delete {selectedDocuments.length} Document{selectedDocuments.length !== 1 ? 's' : ''}
            </h3>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete these {selectedDocuments.length} documents? This action cannot be undone.
            </p>

            <div className="bg-gray-100 rounded-md p-3 mb-4 max-h-32 overflow-y-auto">
              <ul className="text-sm text-gray-700 space-y-1">
                {selectedDocuments.map((doc) => (
                  <li key={doc.id}>• {doc.source_filename}</li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will permanently delete for each document:
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside mt-2">
                <li>The document file</li>
                <li>All extracted text and data</li>
                <li>All findings and citations</li>
                <li>All validation issues</li>
              </ul>
            </div>

            {isLoading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(progress.completed / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Deleting {progress.completed} of {progress.total}...
                </p>
              </div>
            )}

            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
