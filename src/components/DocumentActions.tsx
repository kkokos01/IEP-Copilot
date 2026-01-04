'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface Document {
  id: string;
  source_filename: string;
  type: string;
  effective_date?: string | null;
  meeting_date?: string | null;
  storage_path: string;
}

interface DocumentActionsProps {
  document: Document;
  onUpdate?: (updatedDocument: Document) => void;
  onDelete?: () => void;
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

export default function DocumentActions({ document, onUpdate, onDelete }: DocumentActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showRecategorizeModal, setShowRecategorizeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [newFilename, setNewFilename] = useState(document.source_filename);
  const [newType, setNewType] = useState(document.type);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!newFilename.trim()) {
      setError('Filename cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_filename: newFilename.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || 'Failed to rename document');
        return;
      }

      if (onUpdate && result.document) {
        onUpdate(result.document);
      }

      setShowRenameModal(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecategorize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || 'Failed to recategorize document');
        return;
      }

      if (onUpdate && result.document) {
        onUpdate(result.document);
      }

      setShowRecategorizeModal(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || 'Failed to delete document');
        return;
      }

      if (onDelete) {
        onDelete();
      }

      setShowDeleteModal(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Three-dot menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Document actions"
      >
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={() => {
                  setShowRenameModal(true);
                  setNewFilename(document.source_filename);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setShowRecategorizeModal(true);
                  setNewType(document.type);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Recategorize
              </button>
              <hr className="my-1" />
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Rename Document</h3>

            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new filename"
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recategorize Modal */}
      {showRecategorizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Recategorize Document</h3>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

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
                onClick={handleRecategorize}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Document</h3>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{document.source_filename}</strong>? This action cannot be undone.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will permanently delete:
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside mt-2">
                <li>The document file</li>
                <li>All extracted text and data</li>
                <li>All findings and citations</li>
                <li>All validation issues</li>
              </ul>
            </div>

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
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
