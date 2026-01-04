import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Get user's children
    const { data: children, error: childrenError } = await getSupabaseAdmin()
      .from('children')
      .select('id')
      .eq('user_id', user.id);

    if (childrenError || !children || children.length === 0) {
      console.error('Failed to fetch children:', childrenError);
      // Return empty analytics if user has no children
      return NextResponse.json({
        overview: { totalDocuments: 0, totalIEPs: 0, processedDocuments: 0, failedDocuments: 0, processingDocuments: 0, structuredExtractions: 0 },
        validation: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0, fixedCount: 0, issuesByCategory: {}, issuesBySeverity: { error: 0, warning: 0, info: 0 } },
        iepData: { totalGoals: 0, goalsByDomain: {}, totalServices: 0, servicesByType: {}, totalAccommodations: 0, studentsWithIEPs: 0, averageGoalsPerIEP: 0, averageServicesPerIEP: 0 },
        compliance: { overdueReviews: 0, longDurationIEPs: 0, missingBaselines: 0, unmeasurableGoals: 0 }
      });
    }

    const childIds = children.map(c => c.id);

    // Step 2: Get cases for user's children
    const { data: cases, error: casesError } = await getSupabaseAdmin()
      .from('cases')
      .select('id, child_id, name')
      .in('child_id', childIds);

    if (casesError) {
      console.error('Failed to fetch cases:', casesError);
      return NextResponse.json({ error: 'Failed to fetch cases', details: casesError.message }, { status: 500 });
    }

    // If no cases exist, return empty analytics
    if (!cases || cases.length === 0) {
      console.log('User has children but no cases');
      return NextResponse.json({
        overview: { totalDocuments: 0, totalIEPs: 0, processedDocuments: 0, failedDocuments: 0, processingDocuments: 0, structuredExtractions: 0 },
        validation: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0, fixedCount: 0, issuesByCategory: {}, issuesBySeverity: { error: 0, warning: 0, info: 0 } },
        iepData: { totalGoals: 0, goalsByDomain: {}, totalServices: 0, servicesByType: {}, totalAccommodations: 0, studentsWithIEPs: 0, averageGoalsPerIEP: 0, averageServicesPerIEP: 0 },
        compliance: { overdueReviews: 0, longDurationIEPs: 0, missingBaselines: 0, unmeasurableGoals: 0 }
      });
    }

    const caseIds = cases.map(c => c.id);

    // Step 3: Get documents for those cases
    const { data: documents, error: docsError } = await getSupabaseAdmin()
      .from('documents')
      .select('id, type, status, created_at, page_count, is_partial_extraction, metadata, case_id')
      .in('case_id', caseIds);

    if (docsError) {
      console.error('Failed to fetch documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch documents', details: docsError.message }, { status: 500 });
    }

    // If no documents exist, return empty analytics
    if (!documents || documents.length === 0) {
      console.log('User has cases but no documents');
      return NextResponse.json({
        overview: { totalDocuments: 0, totalIEPs: 0, processedDocuments: 0, failedDocuments: 0, processingDocuments: 0, structuredExtractions: 0 },
        validation: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0, fixedCount: 0, issuesByCategory: {}, issuesBySeverity: { error: 0, warning: 0, info: 0 } },
        iepData: { totalGoals: 0, goalsByDomain: {}, totalServices: 0, servicesByType: {}, totalAccommodations: 0, studentsWithIEPs: 0, averageGoalsPerIEP: 0, averageServicesPerIEP: 0 },
        compliance: { overdueReviews: 0, longDurationIEPs: 0, missingBaselines: 0, unmeasurableGoals: 0 }
      });
    }

    // Step 4: Get extracted IEP data for these documents
    const documentIds = documents.map(d => d.id);
    const { data: extractions } = await getSupabaseAdmin()
      .from('extracted_iep_data')
      .select('id, document_id, data, extracted_at')
      .in('document_id', documentIds);

    // Step 5: Get validation issues for extractions
    const extractionIds = extractions?.map(e => e.id) || [];
    const { data: issues } = await getSupabaseAdmin()
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
  } catch (error: any) {
    console.error('Analytics error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
