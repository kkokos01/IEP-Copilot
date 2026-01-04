'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface ChildAnalytics {
  child: {
    id: string
    name: string
    currentGrade: string | null
    currentSchool: string | null
  }
  overview: {
    totalIEPs: number
    dateRange: { first: string | null; latest: string | null }
    latestIEPDate: string | null
    complianceStatus: {
      annualReview: { date: string | null; status: string; daysUntilDue: number | null }
      triennialEvaluation: { date: string | null; status: string; daysUntilDue: number | null }
    }
  }
  timeline: Array<{
    iepDate: string | null
    meetingDate: string | null
    goalCount: number
    goalsByDomain: Record<string, number>
    serviceCount: number
    servicesByType: Record<string, number>
    accommodationCount: number
    totalServiceMinutesPerWeek: number
    validationIssues: { total: number; errors: number; warnings: number }
  }>
  latestVsPrevious: {
    goals: {
      current: number
      previous: number
      change: number
      added: number
      removed: number
      continued: number
      domainChanges: Record<string, { current: number; previous: number; change: number }>
    }
    services: {
      current: number
      previous: number
      added: Array<{ type: string; frequency: string; duration: string }>
      removed: Array<{ type: string; frequency: string; duration: string }>
      modified: Array<{ type: string; from: string; to: string }>
      totalMinutesPerWeek: { current: number; previous: number; change: number }
    }
    accommodations: {
      current: number
      previous: number
      added: string[]
      removed: string[]
    }
  } | null
  validation: {
    totalIssues: number
    openIssues: number
    byCategory: Record<string, number>
    bySeverity: { error: number; warning: number; info: number }
    recentIssues: Array<{
      iepDate: string | null
      severity: string
      category: string
      title: string
      message: string
      status: string
    }>
  }
}

interface PageProps {
  params: Promise<{ childId: string }>
}

export default function ChildAnalyticsPage({ params }: PageProps) {
  const [childId, setChildId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<ChildAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(p => setChildId(p.childId))
  }, [params])

  useEffect(() => {
    if (!childId) return

    const loadAnalytics = async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const session = await getSupabaseClient().auth.getSession()
      const token = session.data.session?.access_token

      const response = await fetch(`/api/children/${childId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load analytics')
        setLoading(false)
        return
      }

      const data = await response.json()
      setAnalytics(data)
      setLoading(false)
    }

    loadAnalytics()
  }, [router, childId])

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50'
      case 'due_soon': return 'text-yellow-600 bg-yellow-50'
      case 'current': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getComplianceLabel = (status: string, days: number | null) => {
    switch (status) {
      case 'overdue': return `Overdue by ${days} days`
      case 'due_soon': return `Due in ${days} days`
      case 'current': return `Current (${days} days)`
      default: return 'Unknown'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 mb-2 flex items-center"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{analytics.child.name}</h1>
              <p className="text-gray-600 mt-1">
                {analytics.child.currentGrade && `Grade: ${analytics.child.currentGrade}`}
                {analytics.child.currentGrade && analytics.child.currentSchool && ' • '}
                {analytics.child.currentSchool && `School: ${analytics.child.currentSchool}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total IEPs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total IEPs</h3>
            <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalIEPs}</p>
            {analytics.overview.dateRange.first && analytics.overview.dateRange.latest && (
              <p className="text-sm text-gray-600 mt-2">
                {new Date(analytics.overview.dateRange.first).getFullYear()} - {new Date(analytics.overview.dateRange.latest).getFullYear()}
              </p>
            )}
          </div>

          {/* Annual Review */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Annual Review</h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceColor(analytics.overview.complianceStatus.annualReview.status)}`}>
              {getComplianceLabel(
                analytics.overview.complianceStatus.annualReview.status,
                analytics.overview.complianceStatus.annualReview.daysUntilDue
              )}
            </div>
          </div>

          {/* Triennial Evaluation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Triennial Evaluation</h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceColor(analytics.overview.complianceStatus.triennialEvaluation.status)}`}>
              {getComplianceLabel(
                analytics.overview.complianceStatus.triennialEvaluation.status,
                analytics.overview.complianceStatus.triennialEvaluation.daysUntilDue
              )}
            </div>
          </div>
        </div>

        {/* Latest vs Previous Comparison */}
        {analytics.latestVsPrevious && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Latest IEP Changes</h2>
              <p className="text-sm text-gray-600 mt-1">Comparison with previous IEP</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Goals */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Goals</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current:</span>
                      <span className="text-sm font-medium">{analytics.latestVsPrevious.goals.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-600">Added:</span>
                      <span className="text-sm font-medium text-green-600">{analytics.latestVsPrevious.goals.added}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-600">Removed:</span>
                      <span className="text-sm font-medium text-red-600">{analytics.latestVsPrevious.goals.removed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">Continued:</span>
                      <span className="text-sm font-medium text-blue-600">{analytics.latestVsPrevious.goals.continued}</span>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Services</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current:</span>
                      <span className="text-sm font-medium">{analytics.latestVsPrevious.services.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Hours/week:</span>
                      <span className="text-sm font-medium">
                        {Math.round(analytics.latestVsPrevious.services.totalMinutesPerWeek.current / 60 * 10) / 10}h
                        {analytics.latestVsPrevious.services.totalMinutesPerWeek.change !== 0 && (
                          <span className={analytics.latestVsPrevious.services.totalMinutesPerWeek.change > 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({analytics.latestVsPrevious.services.totalMinutesPerWeek.change > 0 ? '+' : ''}
                            {Math.round(analytics.latestVsPrevious.services.totalMinutesPerWeek.change / 60 * 10) / 10}h)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-600">Added:</span>
                      <span className="text-sm font-medium text-green-600">{analytics.latestVsPrevious.services.added.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-600">Removed:</span>
                      <span className="text-sm font-medium text-red-600">{analytics.latestVsPrevious.services.removed.length}</span>
                    </div>
                  </div>
                </div>

                {/* Accommodations */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Accommodations</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current:</span>
                      <span className="text-sm font-medium">{analytics.latestVsPrevious.accommodations.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-600">Added:</span>
                      <span className="text-sm font-medium text-green-600">{analytics.latestVsPrevious.accommodations.added.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-600">Removed:</span>
                      <span className="text-sm font-medium text-red-600">{analytics.latestVsPrevious.accommodations.removed.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Changes Detail */}
              {(analytics.latestVsPrevious.services.added.length > 0 ||
                analytics.latestVsPrevious.services.removed.length > 0 ||
                analytics.latestVsPrevious.services.modified.length > 0) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Service Details</h3>

                  {analytics.latestVsPrevious.services.added.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-600 mb-2">Added Services:</p>
                      <ul className="space-y-1">
                        {analytics.latestVsPrevious.services.added.map((service, i) => (
                          <li key={i} className="text-sm text-gray-700 pl-4">
                            • {service.type} - {service.frequency}, {service.duration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analytics.latestVsPrevious.services.removed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-red-600 mb-2">Removed Services:</p>
                      <ul className="space-y-1">
                        {analytics.latestVsPrevious.services.removed.map((service, i) => (
                          <li key={i} className="text-sm text-gray-700 pl-4">
                            • {service.type} - {service.frequency}, {service.duration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analytics.latestVsPrevious.services.modified.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-600 mb-2">Modified Services:</p>
                      <ul className="space-y-1">
                        {analytics.latestVsPrevious.services.modified.map((service, i) => (
                          <li key={i} className="text-sm text-gray-700 pl-4">
                            • {service.type}: {service.from} → {service.to}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">IEP Timeline</h2>
            <p className="text-sm text-gray-600 mt-1">Goals, services, and accommodations over time</p>
          </div>
          <div className="p-6">
            {analytics.timeline.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goals</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours/Week</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accommodations</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.timeline.map((entry, index) => (
                      <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.iepDate ? new Date(entry.iepDate).toLocaleDateString() : 'N/A'}
                          {index === 0 && <span className="ml-2 text-blue-600 font-medium">(Latest)</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.goalCount}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.serviceCount}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(entry.totalServiceMinutesPerWeek / 60 * 10) / 10}h
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.accommodationCount}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {entry.validationIssues.total > 0 ? (
                            <span className="text-sm text-red-600">
                              {entry.validationIssues.errors > 0 && `${entry.validationIssues.errors} errors`}
                              {entry.validationIssues.errors > 0 && entry.validationIssues.warnings > 0 && ', '}
                              {entry.validationIssues.warnings > 0 && `${entry.validationIssues.warnings} warnings`}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No IEP data available</p>
            )}
          </div>
        </div>

        {/* Validation Issues */}
        {analytics.validation.totalIssues > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Validation Issues</h2>
              <p className="text-sm text-gray-600 mt-1">
                {analytics.validation.openIssues} open issues ({analytics.validation.bySeverity.error} errors, {analytics.validation.bySeverity.warning} warnings, {analytics.validation.bySeverity.info} info)
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.validation.recentIssues.map((issue, index) => (
                  <div key={index} className="border-l-4 pl-4 py-2" style={{
                    borderColor: issue.severity === 'error' ? '#ef4444' : issue.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                  }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{issue.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{issue.message}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            issue.severity === 'error' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="text-xs text-gray-500">{issue.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
