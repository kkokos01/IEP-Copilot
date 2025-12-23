'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Document = Database['public']['Tables']['documents']['Row']
type Case = Database['public']['Tables']['cases']['Row'] & {
  children: { name: string }
}

export default function CasePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('other')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      loadCaseData(params.id)
    }
    getUser()
  }, [router, params.id])

  const loadCaseData = async (caseId: string) => {
    // Load case info
    const { data: caseInfo } = await getSupabaseClient()
      .from('cases')
      .select('*, children(name)')
      .eq('id', caseId)
      .single()

    if (!caseInfo) {
      router.push('/dashboard')
      return
    }

    setCaseData(caseInfo)

    // Load documents
    const { data: docs } = await getSupabaseClient()
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    setDocuments(docs || [])
    setLoading(false)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)

    try {
      // Get auth token
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Generate a unique document ID
      const documentId = crypto.randomUUID()
      
      // Upload directly to Supabase Storage
      const storagePath = `${session.user.id}/${documentId}/original.pdf`
      const { error: uploadError } = await getSupabaseClient().storage
        .from('documents')
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Create document record via API (no file body)
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          storagePath,
          caseId: params.id,
          type: documentType,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Clean up storage if API call fails
        await getSupabaseClient().storage
          .from('documents')
          .remove([storagePath])
        throw new Error(result.error || 'Upload failed')
      }

      // Refresh documents list
      loadCaseData(params.id)
      setSelectedFile(null)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'processing':
      case 'extracted':
      case 'analyzing': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Dashboard
              </button>
              <h1 className="text-xl font-semibold">
                {caseData?.name} - {caseData?.children?.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Upload Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Upload Document</h2>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="iep">IEP</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="progress_report">Progress Report</option>
                  <option value="email">Email</option>
                  <option value="meeting_notes">Meeting Notes</option>
                  <option value="prior_written_notice">Prior Written Notice</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select PDF File
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Documents</h2>
            
            {documents.length === 0 ? (
              <p className="text-gray-500">No documents uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{doc.source_filename}</h3>
                        <p className="text-sm text-gray-600">
                          Type: {doc.type} | Pages: {doc.page_count || 'Processing...'}
                        </p>
                        {doc.error_message && (
                          <p className="text-sm text-red-600 mt-1">{doc.error_message}</p>
                        )}
                      </div>
                      <div className={`text-sm font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </div>
                    </div>
                    
                    {doc.status === 'complete' && (
                      <button
                        onClick={() => router.push(`/document/${doc.id}`)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Findings →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
