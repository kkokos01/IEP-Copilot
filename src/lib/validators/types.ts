// Type definitions for IEP validators

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'missing_field' | 'invalid_format' | 'compliance' | 'quality';
  title: string;
  message: string;
  fieldPath?: string;
  validatorName: string;
  validatorVersion: string;
}

export interface IEPData {
  student?: {
    name?: { value?: string; evidence?: any[] };
    dateOfBirth?: { value?: string; evidence?: any[] };
    grade?: { value?: string; evidence?: any[] };
    school?: { value?: string; evidence?: any[] };
    district?: { value?: string; evidence?: any[] };
    primaryLanguage?: { value?: string; evidence?: any[] };
  };
  disability?: {
    primary?: { value?: string; evidence?: any[] };
    secondary?: Array<{ value?: string; evidence?: any[] }>;
  };
  dates?: {
    iepStartDate?: { value?: string; evidence?: any[] };
    iepEndDate?: { value?: string; evidence?: any[] };
    annualReviewDate?: { value?: string; evidence?: any[] };
    triennialEvaluationDate?: { value?: string; evidence?: any[] };
    nextProgressReportDate?: { value?: string; evidence?: any[] };
  };
  plaafp?: {
    academicStrengths?: { value?: string; evidence?: any[] };
    academicNeeds?: { value?: string; evidence?: any[] };
    functionalStrengths?: { value?: string; evidence?: any[] };
    functionalNeeds?: { value?: string; evidence?: any[] };
    parentConcerns?: { value?: string; evidence?: any[] };
  };
  goals?: Array<{
    goalText?: { value?: string; evidence?: any[] };
    domain?: { value?: string; evidence?: any[] };
    baseline?: { value?: string; evidence?: any[] };
    target?: { value?: string; evidence?: any[] };
    measurementMethod?: { value?: string; evidence?: any[] };
    progressMonitoringFrequency?: { value?: string; evidence?: any[] };
  }>;
  services?: Array<{
    serviceType?: { value?: string; evidence?: any[] };
    frequency?: { value?: string; evidence?: any[] };
    duration?: { value?: string; evidence?: any[] };
    location?: { value?: string; evidence?: any[] };
    provider?: { value?: string; evidence?: any[] };
    startDate?: { value?: string; evidence?: any[] };
    endDate?: { value?: string; evidence?: any[] };
  }>;
  accommodations?: Array<{
    description?: { value?: string; evidence?: any[] };
    category?: { value?: string; evidence?: any[] };
    appliesTo?: { value?: string; evidence?: any[] };
  }>;
}
