'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Child = Database['public']['Tables']['children']['Row']
type Case = Database['public']['Tables']['cases']['Row']

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [newChildName, setNewChildName] = useState('')
  const [newCaseName, setNewCaseName] = useState('')
  const [selectedChildId, setSelectedChildId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      loadData(user.id)
    }
    getUser()
  }, [router])

  const loadData = async (userId: string) => {
    // Load children
    const { data: childrenData } = await getSupabaseClient()
      .from('children')
      .select('*')
      .eq('user_id', userId)
    
    setChildren(childrenData || [])

    // Load cases with child info
    const { data: casesData } = await getSupabaseClient()
      .from('cases')
      .select('*, children(name)')
      .in('child_id', childrenData?.map(c => c.id) || [])
    
    setCases(casesData || [])
    setLoading(false)
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChildName.trim()) return

    const { data } = await getSupabaseClient()
      .from('children')
      .insert({ name: newChildName, user_id: user.id })
      .select()
      .single()

    if (data) {
      setChildren([...children, data])
      setNewChildName('')
    }
  }

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCaseName.trim() || !selectedChildId) return

    const { data } = await getSupabaseClient()
      .from('cases')
      .insert({ name: newCaseName, child_id: selectedChildId })
      .select('*, children(name)')
      .single()

    if (data) {
      setCases([...cases, data])
      setNewCaseName('')
      setSelectedChildId('')
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
              <h1 className="text-xl font-semibold">IEP Copilot</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/analytics')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                📊 Analytics
              </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Children Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Children</h2>
              
              <form onSubmit={handleAddChild} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Child's name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {children.map((child) => (
                  <div key={child.id} className="p-3 bg-gray-50 rounded">
                    {child.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Cases Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Cases</h2>
              
              <form onSubmit={handleAddCase} className="mb-4">
                <div className="space-y-2">
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCaseName}
                      onChange={(e) => setNewCaseName(e.target.value)}
                      placeholder="Case name (e.g., 2025-2026 IEP)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-2">
                {cases.map((caseItem: any) => (
                  <div key={caseItem.id} className="p-3 bg-gray-50 rounded">
                    <div className="font-medium">{caseItem.name}</div>
                    <div className="text-sm text-gray-600">{caseItem.children?.name}</div>
                    <a
                      href={`/case/${caseItem.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
                    >
                      View Documents →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
