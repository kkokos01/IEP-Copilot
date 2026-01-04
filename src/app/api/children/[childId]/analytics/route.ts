import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface Goal {
  goalText?: { value: string };
  domain?: { value: string };
}

interface Service {
  serviceType?: { value: string };
  frequency?: { value: string };
  duration?: { value: string };
}

interface IEPData {
  goals?: Goal[];
  services?: Service[];
  accommodations?: any[];
  student?: {
    name?: { value: string };
    grade?: { value: string };
    school?: { value: string };
  };
  iepDates?: {
    nextAnnualReview?: { value: string };
    nextTriennialEvaluation?: { value: string };
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 and 1, where 1 is identical
 */
function similarity(s1: string = '', s2: string = ''): number {
  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s2.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s1.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s1.length] = lastValue;
  }
  return costs[s1.length];
}

/**
 * Compare goals between two IEPs
 * Uses fuzzy matching to identify continued vs new vs removed goals
 */
function compareGoals(currentGoals: Goal[] = [], previousGoals: Goal[] = []) {
  const added: Goal[] = [];
  const removed: Goal[] = [];
  const continued: Goal[] = [];

  // Find continued and added goals
  currentGoals.forEach(cGoal => {
    const match = previousGoals.find(pGoal => {
      const textSimilarity = similarity(
        cGoal.goalText?.value || '',
        pGoal.goalText?.value || ''
      );
      const sameDomain = cGoal.domain?.value === pGoal.domain?.value;

      return textSimilarity > 0.8 && sameDomain;
    });

    if (match) {
      continued.push(cGoal);
    } else {
      added.push(cGoal);
    }
  });

  // Find removed goals
  previousGoals.forEach(pGoal => {
    const match = currentGoals.find(cGoal => {
      const textSimilarity = similarity(
        cGoal.goalText?.value || '',
        pGoal.goalText?.value || ''
      );
      const sameDomain = cGoal.domain?.value === pGoal.domain?.value;

      return textSimilarity > 0.8 && sameDomain;
    });

    if (!match) {
      removed.push(pGoal);
    }
  });

  return { added, removed, continued };
}

/**
 * Parse frequency from text (e.g., "2 times per week" → 2)
 */
function parseFrequency(text: string = ''): number | null {
  if (!text) return null;

  // Match patterns like "2 times per week", "2x/week", "2 per week"
  const match = text.match(/(\d+)\s*(?:times?|x)\s*(?:per|\/)\s*week/i);
  if (match) return parseInt(match[1]);

  // Handle special cases
  if (/daily/i.test(text)) return 5;  // Assuming 5 school days per week
  if (/monthly/i.test(text)) return 0.25;  // Approximate weekly equivalent

  return null;
}

/**
 * Parse duration from text (e.g., "30 minutes" → 30)
 */
function parseDuration(text: string = ''): number | null {
  if (!text) return null;

  // Match "30 minutes" or "30 min"
  const minuteMatch = text.match(/(\d+)\s*min/i);
  if (minuteMatch) return parseInt(minuteMatch[1]);

  // Match "1 hour" or "1.5 hours"
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)/i);
  if (hourMatch) return parseFloat(hourMatch[1]) * 60;

  return null;
}

/**
 * Calculate total service minutes per week from services array
 */
function calculateServiceHours(services: Service[] = []): number {
  let totalMinutesPerWeek = 0;

  services.forEach(service => {
    const frequency = parseFrequency(service.frequency?.value || '');
    const duration = parseDuration(service.duration?.value || '');

    if (frequency && duration) {
      totalMinutesPerWeek += frequency * duration;
    }
  });

  return totalMinutesPerWeek;
}

/**
 * Get compliance status based on due date
 */
function getComplianceStatus(dateStr: string | null | undefined): {
  date: string | null;
  status: 'current' | 'due_soon' | 'overdue' | 'unknown';
  daysUntilDue: number | null;
} {
  if (!dateStr) {
    return { date: null, status: 'unknown', daysUntilDue: null };
  }

  const dueDate = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { date: dateStr, status: 'overdue', daysUntilDue: Math.abs(diffDays) };
  } else if (diffDays <= 30) {
    return { date: dateStr, status: 'due_soon', daysUntilDue: diffDays };
  } else {
    return { date: dateStr, status: 'current', daysUntilDue: diffDays };
  }
}

/**
 * Compare services between two IEPs
 */
function compareServices(currentServices: Service[] = [], previousServices: Service[] = []) {
  const added: any[] = [];
  const removed: any[] = [];
  const modified: any[] = [];

  // Check for added and modified services
  currentServices.forEach(cService => {
    const match = previousServices.find(
      pService => pService.serviceType?.value === cService.serviceType?.value
    );

    if (!match) {
      added.push({
        type: cService.serviceType?.value || 'Unknown',
        frequency: cService.frequency?.value || '',
        duration: cService.duration?.value || ''
      });
    } else {
      // Check if frequency or duration changed
      const freqChanged = cService.frequency?.value !== match.frequency?.value;
      const durChanged = cService.duration?.value !== match.duration?.value;

      if (freqChanged || durChanged) {
        modified.push({
          type: cService.serviceType?.value || 'Unknown',
          from: `${match.frequency?.value || ''}, ${match.duration?.value || ''}`,
          to: `${cService.frequency?.value || ''}, ${cService.duration?.value || ''}`
        });
      }
    }
  });

  // Check for removed services
  previousServices.forEach(pService => {
    const match = currentServices.find(
      cService => cService.serviceType?.value === pService.serviceType?.value
    );

    if (!match) {
      removed.push({
        type: pService.serviceType?.value || 'Unknown',
        frequency: pService.frequency?.value || '',
        duration: pService.duration?.value || ''
      });
    }
  });

  return { added, removed, modified };
}

/**
 * Compare accommodations between two IEPs
 */
function compareAccommodations(currentAccoms: any[] = [], previousAccoms: any[] = []) {
  const currentTexts = new Set(
    currentAccoms.map(a => a.description?.value || '').filter(Boolean)
  );
  const previousTexts = new Set(
    previousAccoms.map(a => a.description?.value || '').filter(Boolean)
  );

  const added = Array.from(currentTexts).filter(text => !previousTexts.has(text));
  const removed = Array.from(previousTexts).filter(text => !currentTexts.has(text));

  return { added, removed };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    // 1. AUTHENTICATION
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { childId } = await params;

    // 2. FETCH CHILD'S IEP TIMELINE
    const { data: ieps, error: iepsError } = await getSupabaseAdmin()
      .from('documents')
      .select(`
        id,
        effective_date,
        meeting_date,
        status,
        case_id,
        cases!inner (
          id,
          child_id,
          children!inner (
            id,
            name,
            user_id
          )
        ),
        extracted_iep_data (
          id,
          data,
          extracted_at
        )
      `)
      .eq('cases.child_id', childId)
      .eq('type', 'iep')
      .eq('status', 'complete')
      .order('effective_date', { ascending: false });

    if (iepsError) {
      console.error('Failed to fetch IEPs:', iepsError);
      return NextResponse.json({
        error: 'Failed to fetch IEP data',
        details: iepsError.message
      }, { status: 500 });
    }

    // 3. VERIFY OWNERSHIP
    if (!ieps || ieps.length === 0) {
      return NextResponse.json({
        error: 'No IEPs found for this child',
        code: 'NO_IEPS_FOUND'
      }, { status: 404 });
    }

    const childData = (ieps[0] as any)?.cases?.children;
    if (childData?.user_id !== user.id) {
      return NextResponse.json({
        error: 'Child not found',
        code: 'CHILD_NOT_FOUND'
      }, { status: 404 });
    }

    // 4. FETCH VALIDATION ISSUES FOR THIS CHILD
    const documentIds = ieps.map(iep => iep.id);
    const { data: issues } = await getSupabaseAdmin()
      .from('validation_issues')
      .select(`
        id,
        severity,
        category,
        title,
        message,
        status,
        extracted_iep_data!inner (
          id,
          document_id
        )
      `)
      .in('extracted_iep_data.document_id', documentIds);

    // 5. BUILD RESPONSE

    // Timeline data
    const timeline = ieps.map((iep: any) => {
      const data = iep.extracted_iep_data?.[0]?.data as IEPData | undefined;
      const goals = data?.goals || [];
      const services = data?.services || [];
      const accommodations = data?.accommodations || [];

      // Count goals by domain
      const goalsByDomain: Record<string, number> = {};
      goals.forEach(goal => {
        const domain = goal.domain?.value || 'Other';
        goalsByDomain[domain] = (goalsByDomain[domain] || 0) + 1;
      });

      // Count services by type
      const servicesByType: Record<string, number> = {};
      services.forEach(service => {
        const type = service.serviceType?.value || 'Other';
        servicesByType[type] = (servicesByType[type] || 0) + 1;
      });

      // Calculate validation issues for this IEP
      const iepIssues = issues?.filter(
        (issue: any) => issue.extracted_iep_data?.[0]?.document_id === iep.id
      ) || [];

      return {
        iepDate: iep.effective_date,
        meetingDate: iep.meeting_date,
        goalCount: goals.length,
        goalsByDomain,
        serviceCount: services.length,
        servicesByType,
        accommodationCount: accommodations.length,
        totalServiceMinutesPerWeek: calculateServiceHours(services),
        validationIssues: {
          total: iepIssues.length,
          errors: iepIssues.filter(i => i.severity === 'error').length,
          warnings: iepIssues.filter(i => i.severity === 'warning').length
        }
      };
    });

    // Latest vs Previous comparison
    let latestVsPrevious = null;
    if (ieps.length >= 2) {
      const latest = ieps[0].extracted_iep_data?.[0]?.data as IEPData | undefined;
      const previous = ieps[1].extracted_iep_data?.[0]?.data as IEPData | undefined;

      const currentGoals = latest?.goals || [];
      const previousGoals = previous?.goals || [];
      const goalComparison = compareGoals(currentGoals, previousGoals);

      // Domain-level changes
      const domainChanges: Record<string, { current: number; previous: number; change: number }> = {};
      const allDomains = new Set([
        ...currentGoals.map(g => g.domain?.value || 'Other'),
        ...previousGoals.map(g => g.domain?.value || 'Other')
      ]);

      allDomains.forEach(domain => {
        const current = currentGoals.filter(g => (g.domain?.value || 'Other') === domain).length;
        const prev = previousGoals.filter(g => (g.domain?.value || 'Other') === domain).length;
        domainChanges[domain] = {
          current,
          previous: prev,
          change: current - prev
        };
      });

      // Service comparison
      const currentServices = latest?.services || [];
      const previousServices = previous?.services || [];
      const serviceComparison = compareServices(currentServices, previousServices);

      // Accommodation comparison
      const currentAccoms = latest?.accommodations || [];
      const previousAccoms = previous?.accommodations || [];
      const accomComparison = compareAccommodations(currentAccoms, previousAccoms);

      latestVsPrevious = {
        goals: {
          current: currentGoals.length,
          previous: previousGoals.length,
          change: currentGoals.length - previousGoals.length,
          added: goalComparison.added.length,
          removed: goalComparison.removed.length,
          continued: goalComparison.continued.length,
          domainChanges
        },
        services: {
          current: currentServices.length,
          previous: previousServices.length,
          added: serviceComparison.added,
          removed: serviceComparison.removed,
          modified: serviceComparison.modified,
          totalMinutesPerWeek: {
            current: calculateServiceHours(currentServices),
            previous: calculateServiceHours(previousServices),
            change: calculateServiceHours(currentServices) - calculateServiceHours(previousServices)
          }
        },
        accommodations: {
          current: currentAccoms.length,
          previous: previousAccoms.length,
          added: accomComparison.added,
          removed: accomComparison.removed
        }
      };
    }

    // Overview
    const latestIEPData = ieps[0]?.extracted_iep_data?.[0]?.data as IEPData | undefined;
    const overview = {
      totalIEPs: ieps.length,
      dateRange: {
        first: ieps[ieps.length - 1]?.effective_date || null,
        latest: ieps[0]?.effective_date || null
      },
      latestIEPDate: ieps[0]?.effective_date || null,
      complianceStatus: {
        annualReview: getComplianceStatus(latestIEPData?.iepDates?.nextAnnualReview?.value),
        triennialEvaluation: getComplianceStatus(latestIEPData?.iepDates?.nextTriennialEvaluation?.value)
      }
    };

    // Validation summary
    const validation = {
      totalIssues: issues?.length || 0,
      openIssues: issues?.filter(i => i.status === 'open').length || 0,
      byCategory: {} as Record<string, number>,
      bySeverity: {
        error: issues?.filter(i => i.severity === 'error').length || 0,
        warning: issues?.filter(i => i.severity === 'warning').length || 0,
        info: issues?.filter(i => i.severity === 'info').length || 0
      },
      recentIssues: issues?.slice(0, 5).map((issue: any) => ({
        iepDate: ieps.find((iep: any) =>
          iep.extracted_iep_data?.[0]?.id === issue.extracted_iep_data?.[0]?.id
        )?.effective_date || null,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        message: issue.message,
        status: issue.status
      })) || []
    };

    // Count issues by category
    issues?.forEach(issue => {
      validation.byCategory[issue.category] = (validation.byCategory[issue.category] || 0) + 1;
    });

    // 6. RETURN RESPONSE
    return NextResponse.json({
      child: {
        id: childData.id,
        name: childData.name,
        currentGrade: latestIEPData?.student?.grade?.value || null,
        currentSchool: latestIEPData?.student?.school?.value || null
      },
      overview,
      timeline,
      latestVsPrevious,
      validation
    });

  } catch (error: any) {
    console.error('Child analytics error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
