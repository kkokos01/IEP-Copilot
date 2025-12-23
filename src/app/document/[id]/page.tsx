'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Document = Database['public']['Tables']['documents']['Row'] & {
  cases: { name: string; children: { name: string } }
}
type Finding = Database['public']['Tables']['findings']['Row']
type Citation = Database['public']['Tables']['citations']['Row']

export default function DocumentPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      loadDocumentData(params.id)
    }
    getUser()
  }, [router, params.id])

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
      .order('created_at', { ascending: false })

    setFindings(findingsData || [])

    // Load citations
    const { data: citationsData } = await getSupabaseClient()
      .from('citations')
      .select('*')
      .eq('document_id', documentId)

    setCitations(citationsData || [])
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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/case/${document?.case_id}`)}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Back to Case
              </button>
              <h1 className="text-xl font-semibold">
                {document?.source_filename}
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
          
          {/* Document Info */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-2">Document Information</h2>
            <div className="text-sm text-gray-600">
              <p>Type: {document?.type}</p>
              <p>Pages: {document?.page_count}</p>
              <p>Case: {document?.cases?.name} ({document?.cases?.children?.name})</p>
            </div>
          </div>

          {/* Findings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">
              AI-Generated Findings ({findings.length})
            </h2>
            
            {findings.length === 0 ? (
              <p className="text-gray-500">No findings available</p>
            ) : (
              <div className="space-y-4">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedFinding(
                      selectedFinding?.id === finding.id ? null : finding
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{finding.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(finding.category)}`}>
                        {finding.category}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{finding.summary}</p>
                    
                    {finding.why_it_matters && (
                      <div className="mb-2">
                        <span className="font-medium text-sm">Why it matters: </span>
                        <span className="text-sm text-gray-600">{finding.why_it_matters}</span>
                      </div>
                    )}

                    {finding.questions_to_ask.length > 0 && (
                      <div className="mb-2">
                        <span className="font-medium text-sm">Questions to ask: </span>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {finding.questions_to_ask.map((question, idx) => (
                            <li key={idx}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round((finding.confidence || 0) * 100)}%
                      </span>
                      <span className="text-xs text-blue-600">
                        {getCitationsForFinding(finding.id).length} citation(s)
                      </span>
                    </div>

                    {/* Citations */}
                    {selectedFinding?.id === finding.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-sm mb-2">Citations:</h4>
                        {getCitationsForFinding(finding.id).map((citation) => (
                          <div key={citation.id} className="bg-gray-50 p-3 rounded mb-2">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium">Page {citation.page_number}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                citation.verification_status === 'verified' 
                                  ? 'bg-green-100 text-green-800'
                                  : citation.verification_status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {citation.verification_status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 italic">&ldquo;{citation.quote_text}&rdquo;</p>
                          </div>
                        ))}
                      </div>
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
