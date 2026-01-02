'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { PdfViewer } from '@/components/document/PdfViewer'
import { EvidencePanel } from '@/components/document/EvidencePanel'

type Document = Database['public']['Tables']['documents']['Row'] & {
  cases: { name: string; children: { name: string } }
}
type Finding = Database['public']['Tables']['findings']['Row']
type Citation = Database['public']['Tables']['citations']['Row']

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  // Highlight state for citation bbox
  const [highlightBbox, setHighlightBbox] = useState<{x0: number; y0: number; x1: number; y1: number} | null>(null)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  // Evidence panel state
  const [showEvidencePanel, setShowEvidencePanel] = useState(false)
  const [currentCitationIndex, setCurrentCitationIndex] = useState(0)
  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'findings' | 'document'>('findings')
  const router = useRouter()

  // Handle async params
  useEffect(() => {
    params.then((p) => setDocumentId(p.id))
  }, [params])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      if (documentId) {
        loadDocumentData(documentId)
      }
    }
    getUser()
  }, [router, documentId])

  const loadDocumentData = async (documentId: string) => {
    // Load document info
    const { data: doc } = await getSupabaseClient()
      .from('documents')
      .select('*, cases(name, children(name))')
      .eq('id', documentId)
      .single()

    if (!doc) {
      router.push('/dashboard')
      return
    }

    setDocument(doc)

    // Load findings
    const { data: findingsData } = await getSupabaseClient()
      .from('findings')
      .select('*')
      .eq('document_id', documentId)
      .order('category')
      .order('created_at', { ascending: false })

    setFindings(findingsData || [])

    // Load citations
    const { data: citationsData } = await getSupabaseClient()
      .from('citations')
      .select('*')
      .eq('document_id', documentId)

    setCitations(citationsData || [])

    // Get signed URL for PDF viewing
    if (doc.storage_path) {
      const { data: signedUrlData } = await getSupabaseClient()
        .storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        setPdfUrl(signedUrlData.signedUrl)
      }
    }

    setLoading(false)
  }

  const getCitationsForFinding = (findingId: string) => {
    return citations.filter(c => c.finding_id === findingId)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'services': return 'bg-blue-100 text-blue-800'
      case 'goals': return 'bg-green-100 text-green-800'
      case 'accommodations': return 'bg-purple-100 text-purple-800'
      case 'baseline': return 'bg-yellow-100 text-yellow-800'
      case 'placement': return 'bg-pink-100 text-pink-800'
      case 'procedural': return 'bg-red-100 text-red-800'
      case 'timeline': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading document...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => router.push(`/case/${document?.case_id}`)}
            className="text-blue-600 hover:text-blue-800 hover:underline mr-4"
          >
            ← Back to Case
          </button>
          <h1 className="text-lg font-semibold truncate max-w-md">
            {document?.source_filename}
          </h1>
          <span className="ml-3 text-sm text-gray-500">
            {document?.page_count} pages
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-b bg-white flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('findings')}
            className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'findings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Findings ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('document')}
            className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'document'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Document
          </button>
        </div>
      </div>

      {/* Two-Pane Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Findings */}
        <div className={`
          ${activeTab === 'findings' ? 'block' : 'hidden'}
          md:block w-full md:w-[35%] lg:w-[35%] border-r bg-white overflow-y-auto
        `}>
          <div className="p-4">
            {/* Document Info Summary */}
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Type:</span> {document?.type}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Child:</span> {document?.cases?.children?.name}
              </p>
            </div>

            {/* Findings Header */}
            <h2 className="text-lg font-medium mb-4">
              Findings ({findings.length})
            </h2>

            {findings.length === 0 ? (
              <p className="text-gray-500 text-sm">No findings identified in this document.</p>
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedFinding?.id === finding.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFinding(
                      selectedFinding?.id === finding.id ? null : finding
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-sm leading-tight">{finding.title}</h3>
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getCategoryColor(finding.category)}`}>
                        {finding.category}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{finding.summary}</p>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {Math.round((finding.confidence || 0) * 100)}% confidence
                      </span>
                      <span className="text-blue-600">
                        {getCitationsForFinding(finding.id).length} citation(s)
                      </span>
                    </div>

                    {/* Expanded Citation Details */}
                    {selectedFinding?.id === finding.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {finding.why_it_matters && (
                          <div className="mb-2">
                            <span className="font-medium text-xs text-gray-700">Why it matters:</span>
                            <p className="text-xs text-gray-600 mt-0.5">{finding.why_it_matters}</p>
                          </div>
                        )}

                        {finding.questions_to_ask && finding.questions_to_ask.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-xs text-gray-700">Questions to ask:</span>
                            <ul className="text-xs text-gray-600 list-disc list-inside mt-0.5">
                              {finding.questions_to_ask.map((question, idx) => (
                                <li key={idx}>{question}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-2">
                          <span className="font-medium text-xs text-gray-700">Citations:</span>
                          {getCitationsForFinding(finding.id).map((citation) => (
                            <div
                              key={citation.id}
                              className={`p-2 rounded mt-1 cursor-pointer transition-colors ${
                                selectedCitation?.id === citation.id
                                  ? 'bg-yellow-100 ring-2 ring-yellow-400'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                const findingCitations = getCitationsForFinding(finding.id)
                                const citationIndex = findingCitations.findIndex(c => c.id === citation.id)

                                // Ensure finding is selected for evidence panel
                                setSelectedFinding(finding)
                                setCurrentPage(citation.page_number)
                                setSelectedCitation(citation)
                                setCurrentCitationIndex(citationIndex >= 0 ? citationIndex : 0)
                                setShowEvidencePanel(true)

                                // Set highlight bbox if available
                                if (citation.bbox) {
                                  const bbox = citation.bbox as {x0: number; y0: number; x1: number; y1: number}
                                  setHighlightBbox(bbox)
                                } else {
                                  setHighlightBbox(null)
                                }
                                setActiveTab('document') // Switch to document on mobile
                              }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-blue-600">
                                  → Page {citation.page_number}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  citation.verification_status === 'verified'
                                    ? 'bg-green-100 text-green-700'
                                    : citation.verification_status === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {citation.verification_status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 italic line-clamp-2">
                                &ldquo;{citation.quote_text}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: PDF Viewer */}
        <div className={`
          ${activeTab === 'document' ? 'flex' : 'hidden'}
          md:flex w-full md:w-[65%] lg:w-[65%] flex-col bg-gray-100
        `}>
          <div className="flex-1 overflow-hidden">
            {pdfUrl ? (
              <PdfViewer
                url={pdfUrl}
                pageNumber={currentPage}
                onPageChange={(page) => {
                  setCurrentPage(page)
                  // Clear highlight when manually navigating
                  if (selectedCitation?.page_number !== page) {
                    setHighlightBbox(null)
                    setSelectedCitation(null)
                    setShowEvidencePanel(false)
                  }
                }}
                totalPages={document?.page_count || 0}
                highlightBbox={currentPage === selectedCitation?.page_number ? highlightBbox : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">PDF not available</p>
              </div>
            )}
          </div>

          {/* Evidence Panel */}
          {showEvidencePanel && selectedFinding && getCitationsForFinding(selectedFinding.id).length > 0 && (
            <div className="flex-shrink-0">
            <EvidencePanel
              citations={getCitationsForFinding(selectedFinding.id)}
              currentIndex={currentCitationIndex}
              onNavigate={(index) => {
                const findingCitations = getCitationsForFinding(selectedFinding.id)
                const citation = findingCitations[index]
                if (citation) {
                  setCurrentCitationIndex(index)
                  setSelectedCitation(citation)
                  setCurrentPage(citation.page_number)
                  if (citation.bbox) {
                    const bbox = citation.bbox as {x0: number; y0: number; x1: number; y1: number}
                    setHighlightBbox(bbox)
                  } else {
                    setHighlightBbox(null)
                  }
                }
              }}
              onClose={() => {
                setShowEvidencePanel(false)
                setSelectedCitation(null)
                setHighlightBbox(null)
              }}
            />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
