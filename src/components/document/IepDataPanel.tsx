'use client'

import { useState } from 'react'
import type { IEPData } from '@/lib/validators/types'

interface Evidence {
  page: number
  quote: string
  bbox?: { x0: number; y0: number; x1: number; y1: number }
  confidence?: number
}

interface IepDataPanelProps {
  data: IEPData
  onEvidenceClick?: (evidence: Evidence) => void
}

export function IepDataPanel({ data, onEvidenceClick }: IepDataPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['student']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const FieldWithEvidence = ({
    label,
    value,
    evidence
  }: {
    label: string
    value?: string
    evidence?: Evidence[]
  }) => {
    if (!value) return null

    return (
      <div className="mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {label}
            </span>
            <p className="text-sm text-gray-900 mt-1">{value}</p>
          </div>
          {evidence && evidence.length > 0 && (
            <button
              onClick={() => onEvidenceClick?.(evidence[0])}
              className="ml-2 flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Page {evidence[0].page}
            </button>
          )}
        </div>
        {evidence && evidence.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {evidence.slice(1).map((ev, idx) => (
              <button
                key={idx}
                onClick={() => onEvidenceClick?.(ev)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                +Page {ev.page}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const Section = ({
    title,
    sectionKey,
    children,
    count
  }: {
    title: string
    sectionKey: string
    children: React.ReactNode
    count?: number
  }) => {
    const isExpanded = expandedSections.has(sectionKey)

    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
            <span className="font-medium text-gray-900">{title}</span>
            {count !== undefined && (
              <span className="text-xs text-gray-500">({count})</span>
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Structured IEP Data</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Click page numbers to view evidence in document
        </p>
      </div>

      {/* Student Information */}
      {data.student && (
        <Section title="Student Information" sectionKey="student">
          <FieldWithEvidence
            label="Name"
            value={data.student.name?.value}
            evidence={data.student.name?.evidence}
          />
          <FieldWithEvidence
            label="Date of Birth"
            value={data.student.dateOfBirth?.value}
            evidence={data.student.dateOfBirth?.evidence}
          />
          <FieldWithEvidence
            label="Grade"
            value={data.student.grade?.value}
            evidence={data.student.grade?.evidence}
          />
          <FieldWithEvidence
            label="School"
            value={data.student.school?.value}
            evidence={data.student.school?.evidence}
          />
          <FieldWithEvidence
            label="District"
            value={data.student.district?.value}
            evidence={data.student.district?.evidence}
          />
          <FieldWithEvidence
            label="Primary Language"
            value={data.student.primaryLanguage?.value}
            evidence={data.student.primaryLanguage?.evidence}
          />
        </Section>
      )}

      {/* Disability */}
      {data.disability && (
        <Section title="Disability" sectionKey="disability">
          <FieldWithEvidence
            label="Primary Disability"
            value={data.disability.primary?.value}
            evidence={data.disability.primary?.evidence}
          />
          {data.disability.secondary && data.disability.secondary.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Secondary Disabilities
              </span>
              {data.disability.secondary.map((sec, idx) => (
                <div key={idx} className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-900">{sec.value}</p>
                  {sec.evidence && sec.evidence[0] && (
                    <button
                      onClick={() => onEvidenceClick?.(sec.evidence![0])}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Page {sec.evidence[0].page}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Dates */}
      {data.dates && (
        <Section title="IEP Dates" sectionKey="dates">
          <FieldWithEvidence
            label="IEP Start Date"
            value={data.dates.iepStartDate?.value}
            evidence={data.dates.iepStartDate?.evidence}
          />
          <FieldWithEvidence
            label="IEP End Date"
            value={data.dates.iepEndDate?.value}
            evidence={data.dates.iepEndDate?.evidence}
          />
          <FieldWithEvidence
            label="Annual Review Date"
            value={data.dates.annualReviewDate?.value}
            evidence={data.dates.annualReviewDate?.evidence}
          />
          <FieldWithEvidence
            label="Triennial Evaluation Date"
            value={data.dates.triennialEvaluationDate?.value}
            evidence={data.dates.triennialEvaluationDate?.evidence}
          />
        </Section>
      )}

      {/* Goals */}
      {data.goals && data.goals.length > 0 && (
        <Section title="Annual Goals" sectionKey="goals" count={data.goals.length}>
          <div className="space-y-4">
            {data.goals.map((goal, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    Goal {idx + 1}
                  </span>
                  {goal.domain?.value && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      {goal.domain.value}
                    </span>
                  )}
                </div>
                <FieldWithEvidence
                  label="Goal Text"
                  value={goal.goalText?.value}
                  evidence={goal.goalText?.evidence}
                />
                <FieldWithEvidence
                  label="Baseline"
                  value={goal.baseline?.value}
                  evidence={goal.baseline?.evidence}
                />
                <FieldWithEvidence
                  label="Target"
                  value={goal.target?.value}
                  evidence={goal.target?.evidence}
                />
                <FieldWithEvidence
                  label="Measurement Method"
                  value={goal.measurementMethod?.value}
                  evidence={goal.measurementMethod?.evidence}
                />
                <FieldWithEvidence
                  label="Progress Monitoring Frequency"
                  value={goal.progressMonitoringFrequency?.value}
                  evidence={goal.progressMonitoringFrequency?.evidence}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Services */}
      {data.services && data.services.length > 0 && (
        <Section title="Services" sectionKey="services" count={data.services.length}>
          <div className="space-y-4">
            {data.services.map((service, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <span className="text-xs font-semibold text-gray-700">
                  Service {idx + 1}
                </span>
                <FieldWithEvidence
                  label="Service Type"
                  value={service.serviceType?.value}
                  evidence={service.serviceType?.evidence}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FieldWithEvidence
                    label="Frequency"
                    value={service.frequency?.value}
                    evidence={service.frequency?.evidence}
                  />
                  <FieldWithEvidence
                    label="Duration"
                    value={service.duration?.value}
                    evidence={service.duration?.evidence}
                  />
                </div>
                <FieldWithEvidence
                  label="Location"
                  value={service.location?.value}
                  evidence={service.location?.evidence}
                />
                <FieldWithEvidence
                  label="Provider"
                  value={service.provider?.value}
                  evidence={service.provider?.evidence}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Accommodations */}
      {data.accommodations && data.accommodations.length > 0 && (
        <Section title="Accommodations" sectionKey="accommodations" count={data.accommodations.length}>
          <div className="space-y-3">
            {data.accommodations.map((acc, idx) => (
              <div key={idx} className="border-l-2 border-purple-300 pl-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{acc.description?.value}</p>
                    {acc.category?.value && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                        {acc.category.value}
                      </span>
                    )}
                    {acc.appliesTo?.value && (
                      <p className="text-xs text-gray-500 mt-1">
                        Applies to: {acc.appliesTo.value}
                      </p>
                    )}
                  </div>
                  {acc.description?.evidence?.[0] && (
                    <button
                      onClick={() => onEvidenceClick?.(acc.description!.evidence![0])}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Page {acc.description.evidence[0].page}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* PLAAFP (Present Levels) */}
      {data.plaafp && (
        <Section title="Present Levels (PLAAFP)" sectionKey="plaafp">
          <FieldWithEvidence
            label="Academic Strengths"
            value={data.plaafp.academicStrengths?.value}
            evidence={data.plaafp.academicStrengths?.evidence}
          />
          <FieldWithEvidence
            label="Academic Needs"
            value={data.plaafp.academicNeeds?.value}
            evidence={data.plaafp.academicNeeds?.evidence}
          />
          <FieldWithEvidence
            label="Functional Strengths"
            value={data.plaafp.functionalStrengths?.value}
            evidence={data.plaafp.functionalStrengths?.evidence}
          />
          <FieldWithEvidence
            label="Functional Needs"
            value={data.plaafp.functionalNeeds?.value}
            evidence={data.plaafp.functionalNeeds?.evidence}
          />
          <FieldWithEvidence
            label="Parent Concerns"
            value={data.plaafp.parentConcerns?.value}
            evidence={data.plaafp.parentConcerns?.evidence}
          />
        </Section>
      )}
    </div>
  )
}
