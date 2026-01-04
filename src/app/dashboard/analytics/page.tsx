'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Analytics {
  overview: {
    totalDocuments: number
    totalIEPs: number
    processedDocuments: number
    failedDocuments: number
    processingDocuments: number
    structuredExtractions: number
  }
  validation: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
    fixedCount: number
    issuesByCategory: Record<string, number>
    issuesBySeverity: {
      error: number
      warning: number
      info: number
    }
  }
  iepData: {
    totalGoals: number
    goalsByDomain: Record<string, number>
    totalServices: number
    servicesByType: Record<string, number>
    totalAccommodations: number
    studentsWithIEPs: number
    averageGoalsPerIEP: number
    averageServicesPerIEP: number
  }
  compliance: {
    overdueReviews: number
    longDurationIEPs: number
    missingBaselines: number
    unmeasurableGoals: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const loadAnalytics = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      const session = await getSupabaseClient().auth.getSession()
      const token = session.data.session?.access_token

      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }

      setLoading(false)
    }

    loadAnalytics()
  }, [router])

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    )
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    color = 'blue'
  }: {
    title: string
    value: number | string
    subtitle?: string
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      red: 'bg-red-50 border-red-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      purple: 'bg-purple-50 border-purple-200',
      gray: 'bg-gray-50 border-gray-200',
    }

    return (
      <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    )
  }

  const ChartBar = ({
    label,
    value,
    maxValue,
    color = 'blue'
  }: {
    label: string
    value: number
    maxValue: number
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
    }

    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className="font-medium text-gray-900">{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Overview Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Documents"
              value={analytics.overview.totalDocuments}
              subtitle="All uploaded documents"
              color="blue"
            />
            <StatCard
              title="IEP Documents"
              value={analytics.overview.totalIEPs}
              subtitle="Documents tagged as IEPs"
              color="purple"
            />
            <StatCard
              title="Processed"
              value={analytics.overview.processedDocuments}
              subtitle="Successfully processed"
              color="green"
            />
            <StatCard
              title="Structured Extractions"
              value={analytics.overview.structuredExtractions}
              subtitle="IEPs with structured data"
              color="blue"
            />
            <StatCard
              title="Processing"
              value={analytics.overview.processingDocuments}
              subtitle="Currently being processed"
              color="yellow"
            />
            <StatCard
              title="Failed"
              value={analytics.overview.failedDocuments}
              subtitle="Processing failed"
              color="red"
            />
          </div>
        </div>

        {/* Validation Issues Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Issues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              title="Total Issues"
              value={analytics.validation.totalIssues}
              color="gray"
            />
            <StatCard
              title="Errors (Open)"
              value={analytics.validation.errorCount}
              color="red"
            />
            <StatCard
              title="Warnings (Open)"
              value={analytics.validation.warningCount}
              color="yellow"
            />
            <StatCard
              title="Fixed"
              value={analytics.validation.fixedCount}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Issues by Category */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-3">Issues by Category</h3>
              {Object.entries(analytics.validation.issuesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <ChartBar
                    key={category}
                    label={category.replace(/_/g, ' ')}
                    value={count}
                    maxValue={Math.max(...Object.values(analytics.validation.issuesByCategory))}
                    color="blue"
                  />
                ))}
              {Object.keys(analytics.validation.issuesByCategory).length === 0 && (
                <p className="text-sm text-gray-500">No issues found</p>
              )}
            </div>

            {/* Issues by Severity */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-3">Issues by Severity</h3>
              <ChartBar
                label="Errors"
                value={analytics.validation.issuesBySeverity.error}
                maxValue={analytics.validation.totalIssues}
                color="red"
              />
              <ChartBar
                label="Warnings"
                value={analytics.validation.issuesBySeverity.warning}
                maxValue={analytics.validation.totalIssues}
                color="yellow"
              />
              <ChartBar
                label="Info"
                value={analytics.validation.issuesBySeverity.info}
                maxValue={analytics.validation.totalIssues}
                color="blue"
              />
            </div>
          </div>
        </div>

        {/* IEP Data Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">IEP Data Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              title="Total Goals"
              value={analytics.iepData.totalGoals}
              subtitle={`Avg: ${analytics.iepData.averageGoalsPerIEP} per IEP`}
              color="green"
            />
            <StatCard
              title="Total Services"
              value={analytics.iepData.totalServices}
              subtitle={`Avg: ${analytics.iepData.averageServicesPerIEP} per IEP`}
              color="blue"
            />
            <StatCard
              title="Accommodations"
              value={analytics.iepData.totalAccommodations}
              color="purple"
            />
            <StatCard
              title="Students with IEPs"
              value={analytics.iepData.studentsWithIEPs}
              color="gray"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Goals by Domain */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-3">Goals by Domain</h3>
              {Object.entries(analytics.iepData.goalsByDomain)
                .sort((a, b) => b[1] - a[1])
                .map(([domain, count]) => (
                  <ChartBar
                    key={domain}
                    label={domain}
                    value={count}
                    maxValue={Math.max(...Object.values(analytics.iepData.goalsByDomain))}
                    color="green"
                  />
                ))}
              {Object.keys(analytics.iepData.goalsByDomain).length === 0 && (
                <p className="text-sm text-gray-500">No goals data available</p>
              )}
            </div>

            {/* Services by Type */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-3">Services by Type</h3>
              {Object.entries(analytics.iepData.servicesByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <ChartBar
                    key={type}
                    label={type}
                    value={count}
                    maxValue={Math.max(...Object.values(analytics.iepData.servicesByType))}
                    color="blue"
                  />
                ))}
              {Object.keys(analytics.iepData.servicesByType).length === 0 && (
                <p className="text-sm text-gray-500">No services data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Compliance Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overdue Reviews"
              value={analytics.compliance.overdueReviews}
              subtitle="Annual reviews past due"
              color="red"
            />
            <StatCard
              title="Long Duration IEPs"
              value={analytics.compliance.longDurationIEPs}
              subtitle="IEPs > 365 days"
              color="yellow"
            />
            <StatCard
              title="Missing Baselines"
              value={analytics.compliance.missingBaselines}
              subtitle="Goals without baseline data"
              color="yellow"
            />
            <StatCard
              title="Unmeasurable Goals"
              value={analytics.compliance.unmeasurableGoals}
              subtitle="Goals lacking criteria"
              color="yellow"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
