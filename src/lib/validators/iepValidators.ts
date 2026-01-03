import { ValidationIssue, IEPData } from './types';

// Validator: Required fields present
export function validateRequiredFields(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.student?.name?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Student Name',
      message: 'Student name is required but was not found in the IEP',
      fieldPath: '/student/name/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.student?.dateOfBirth?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Date of Birth',
      message: 'Student date of birth is required but was not found',
      fieldPath: '/student/dateOfBirth/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.goals || data.goals.length === 0) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'No Goals Found',
      message: 'IEP must contain at least one annual goal',
      fieldPath: '/goals',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Goal quality (measurability)
export function validateGoalMeasurability(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.goals) return issues;

  data.goals.forEach((goal, index) => {
    const goalText = goal.goalText?.value || '';

    // Check for measurable criteria
    const hasCriteria = /\d+%|\d+\/\d+|\d+ out of \d+|with \d+ accuracy/i.test(goalText);

    if (!hasCriteria) {
      issues.push({
        severity: 'warning',
        category: 'quality',
        title: `Goal ${index + 1}: Not Measurable`,
        message: 'Goal does not include specific measurable criteria (e.g., "80% accuracy", "4 out of 5 trials")',
        fieldPath: `/goals/${index}/goalText/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for baseline
    if (!goal.baseline?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Goal ${index + 1}: Missing Baseline`,
        message: 'Goal does not have baseline data showing current level of performance',
        fieldPath: `/goals/${index}/baseline/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for measurement method
    if (!goal.measurementMethod?.value) {
      issues.push({
        severity: 'info',
        category: 'missing_field',
        title: `Goal ${index + 1}: Measurement Method Not Specified`,
        message: 'Consider specifying how progress toward this goal will be measured',
        fieldPath: `/goals/${index}/measurementMethod/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Validator: Date logic
export function validateDateLogic(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.dates) return issues;

  const startDate = data.dates.iepStartDate?.value ? new Date(data.dates.iepStartDate.value) : null;
  const endDate = data.dates.iepEndDate?.value ? new Date(data.dates.iepEndDate.value) : null;
  const reviewDate = data.dates.annualReviewDate?.value ? new Date(data.dates.annualReviewDate.value) : null;

  if (startDate && endDate && startDate >= endDate) {
    issues.push({
      severity: 'error',
      category: 'invalid_format',
      title: 'Invalid Date Range',
      message: 'IEP end date must be after start date',
      fieldPath: '/dates',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  if (startDate && endDate) {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 366) {
      issues.push({
        severity: 'warning',
        category: 'compliance',
        title: 'IEP Duration Exceeds One Year',
        message: 'IEPs must be reviewed at least annually. This IEP covers more than 365 days.',
        fieldPath: '/dates',
        validatorName: 'validateDateLogic',
        validatorVersion: '1.0',
      });
    }
  }

  if (reviewDate && new Date() > reviewDate) {
    const daysOverdue = Math.floor((new Date().getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

    issues.push({
      severity: 'error',
      category: 'compliance',
      title: 'Annual Review Overdue',
      message: `Annual review was due ${daysOverdue} days ago. Schedule review meeting immediately.`,
      fieldPath: '/dates/annualReviewDate/value',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Service hours calculation
export function validateServiceHours(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.services || data.services.length === 0) {
    issues.push({
      severity: 'warning',
      category: 'missing_field',
      title: 'No Services Listed',
      message: 'No special education or related services found. All IEPs should specify services.',
      fieldPath: '/services',
      validatorName: 'validateServiceHours',
      validatorVersion: '1.0',
    });
    return issues;
  }

  // Check for services with missing frequency or duration
  data.services.forEach((service, index) => {
    if (!service.frequency?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Frequency`,
        message: 'Service frequency not specified (e.g., "2 times per week")',
        fieldPath: `/services/${index}/frequency/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }

    if (!service.duration?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Duration`,
        message: 'Service duration not specified (e.g., "30 minutes")',
        fieldPath: `/services/${index}/duration/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Main validator orchestrator
export function validateIEP(data: IEPData): ValidationIssue[] {
  return [
    ...validateRequiredFields(data),
    ...validateGoalMeasurability(data),
    ...validateDateLogic(data),
    ...validateServiceHours(data),
  ];
}
