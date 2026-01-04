import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all documents for user's children
    const { data: documents } = await supabase
      .from('documents')
      .select(`
        id,
        type,
        status,
        created_at,
        page_count,
        is_partial_extraction,
        metadata,
        cases!inner(
          child_id,
          children!inner(
            id,
            name,
            user_id
          )
        )
      `)
      .eq('cases.children.user_id', user.id);

    if (!documents) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Get extracted IEP data for these documents
    const documentIds = documents.map(d => d.id);
    const { data: extractions } = await supabase
      .from('extracted_iep_data')
      .select('id, document_id, data, extracted_at')
      .in('document_id', documentIds);

    // Get validation issues for extractions
    const extractionIds = extractions?.map(e => e.id) || [];
    const { data: issues } = await supabase
      .from('validation_issues')
      .select('severity, category, status, extracted_iep_data_id')
      .in('extracted_iep_data_id', extractionIds);

    // Calculate analytics
    const analytics = {
      overview: {
        totalDocuments: documents.length,
        totalIEPs: documents.filter(d => d.type === 'iep').length,
        processedDocuments: documents.filter(d => d.status === 'complete').length,
        failedDocuments: documents.filter(d => d.status === 'failed').length,
        processingDocuments: documents.filter(d => d.status === 'processing').length,
        structuredExtractions: extractions?.length || 0,
      },
      validation: {
        totalIssues: issues?.length || 0,
        errorCount: issues?.filter(i => i.severity === 'error' && i.status === 'open').length || 0,
        warningCount: issues?.filter(i => i.severity === 'warning' && i.status === 'open').length || 0,
        infoCount: issues?.filter(i => i.severity === 'info' && i.status === 'open').length || 0,
        fixedCount: issues?.filter(i => i.status === 'fixed').length || 0,
        issuesByCategory: {} as Record<string, number>,
        issuesBySeverity: {
          error: issues?.filter(i => i.severity === 'error').length || 0,
          warning: issues?.filter(i => i.severity === 'warning').length || 0,
          info: issues?.filter(i => i.severity === 'info').length || 0,
        },
      },
      iepData: {
        totalGoals: 0,
        goalsByDomain: {} as Record<string, number>,
        totalServices: 0,
        servicesByType: {} as Record<string, number>,
        totalAccommodations: 0,
        studentsWithIEPs: new Set<string>(),
        averageGoalsPerIEP: 0,
        averageServicesPerIEP: 0,
      },
      compliance: {
        overdueReviews: 0,
        longDurationIEPs: 0,
        missingBaselines: 0,
        unmeasurableGoals: 0,
      },
    };

    // Calculate issue categories
    issues?.forEach(issue => {
      const category = issue.category;
      analytics.validation.issuesByCategory[category] =
        (analytics.validation.issuesByCategory[category] || 0) + 1;
    });

    // Analyze IEP data
    extractions?.forEach(extraction => {
      const data = extraction.data as any;

      // Count goals
      if (data.goals && Array.isArray(data.goals)) {
        analytics.iepData.totalGoals += data.goals.length;

        data.goals.forEach((goal: any) => {
          const domain = goal.domain?.value || 'Other';
          analytics.iepData.goalsByDomain[domain] =
            (analytics.iepData.goalsByDomain[domain] || 0) + 1;
        });
      }

      // Count services
      if (data.services && Array.isArray(data.services)) {
        analytics.iepData.totalServices += data.services.length;

        data.services.forEach((service: any) => {
          const type = service.serviceType?.value || 'Other';
          analytics.iepData.servicesByType[type] =
            (analytics.iepData.servicesByType[type] || 0) + 1;
        });
      }

      // Count accommodations
      if (data.accommodations && Array.isArray(data.accommodations)) {
        analytics.iepData.totalAccommodations += data.accommodations.length;
      }

      // Track unique students
      if (data.student?.name?.value) {
        analytics.iepData.studentsWithIEPs.add(data.student.name.value);
      }
    });

    // Calculate averages
    const iepCount = extractions?.length || 1;
    analytics.iepData.averageGoalsPerIEP =
      Math.round((analytics.iepData.totalGoals / iepCount) * 10) / 10;
    analytics.iepData.averageServicesPerIEP =
      Math.round((analytics.iepData.totalServices / iepCount) * 10) / 10;

    // Count compliance issues
    issues?.forEach(issue => {
      if (issue.category === 'compliance') {
        if (issue.severity === 'error') {
          const title = (issue as any).title || '';
          if (title.includes('Overdue')) analytics.compliance.overdueReviews++;
          if (title.includes('Duration')) analytics.compliance.longDurationIEPs++;
        }
      }
      if (issue.category === 'missing_field') {
        const title = (issue as any).title || '';
        if (title.includes('Baseline')) analytics.compliance.missingBaselines++;
      }
      if (issue.category === 'quality') {
        const title = (issue as any).title || '';
        if (title.includes('Measurable')) analytics.compliance.unmeasurableGoals++;
      }
    });

    // Convert Set to count for response
    const response = {
      ...analytics,
      iepData: {
        ...analytics.iepData,
        studentsWithIEPs: analytics.iepData.studentsWithIEPs.size,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
