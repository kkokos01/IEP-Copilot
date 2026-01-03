'use client'

import { useState } from 'react'

interface ValidationIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  category: string
  title: string
  message: string
  field_path?: string
  validator_name: string
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
}

interface ValidationIssuesPanelProps {
  issues: ValidationIssue[]
  onIssueClick?: (issue: ValidationIssue) => void
  onStatusChange?: (issueId: string, newStatus: ValidationIssue['status']) => Promise<void>
}

export function ValidationIssuesPanel({
  issues,
  onIssueClick,
  onStatusChange
}: ValidationIssuesPanelProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'fixed' | 'dismissed'>('all')
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)

  const getSeverityIcon = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
    }
  }

  const getSeverityColor = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
    }
  }

  const getSeverityBadgeColor = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusBadgeColor = (status: ValidationIssue['status']) => {
    switch (status) {
      case 'open':
        return 'bg-gray-100 text-gray-800'
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800'
      case 'fixed':
        return 'bg-green-100 text-green-800'
      case 'dismissed':
        return 'bg-gray-100 text-gray-500'
    }
  }

  const filteredIssues = issues.filter(issue => {
    if (filter !== 'all' && issue.severity !== filter) return false
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false
    return true
  })

  const errorCount = issues.filter(i => i.severity === 'error' && i.status === 'open').length
  const warningCount = issues.filter(i => i.severity === 'warning' && i.status === 'open').length
  const infoCount = issues.filter(i => i.severity === 'info' && i.status === 'open').length

  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="font-medium text-gray-900 mb-1">No Validation Issues</h3>
        <p className="text-sm text-gray-500">
          This IEP has passed all validation checks
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Validation Issues</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Compliance and quality checks on extracted data
        </p>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-red-600 font-semibold">{errorCount}</span>
            <span className="text-gray-600">errors</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-600 font-semibold">{warningCount}</span>
            <span className="text-gray-600">warnings</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600 font-semibold">{infoCount}</span>
            <span className="text-gray-600">info</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Errors ({issues.filter(i => i.severity === 'error').length})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'warning'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            Warnings ({issues.filter(i => i.severity === 'warning').length})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Info ({issues.filter(i => i.severity === 'info').length})
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              statusFilter === 'open'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter('fixed')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              statusFilter === 'fixed'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Fixed
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No issues match the current filters
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${getSeverityColor(issue.severity)}`}
              onClick={() => {
                setExpandedIssue(expandedIssue === issue.id ? null : issue.id)
                onIssueClick?.(issue)
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getSeverityIcon(issue.severity)}</span>
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {issue.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {issue.message}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityBadgeColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(issue.status)}`}>
                      {issue.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {issue.category}
                    </span>
                    {issue.field_path && (
                      <span className="text-xs text-gray-500 font-mono">
                        {issue.field_path}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Actions */}
              {expandedIssue === issue.id && issue.status === 'open' && onStatusChange && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Mark as:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(issue.id, 'acknowledged')
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Acknowledged
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(issue.id, 'fixed')
                      }}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Fixed
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(issue.id, 'dismissed')
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
