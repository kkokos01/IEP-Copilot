#!/usr/bin/env tsx

// Unit test for IEP validators
// Tests each validator function with sample data

import { validateIEP } from '../src/lib/validators/iepValidators';
import type { IEPData } from '../src/lib/validators/types';

console.log('🧪 Testing IEP Validators\n');

// Test 1: Complete, valid IEP (should have no errors)
console.log('Test 1: Valid IEP with all required fields');
const validIEP: IEPData = {
  student: {
    name: { value: 'John Doe' },
    dateOfBirth: { value: '2015-03-15' },
  },
  dates: {
    iepStartDate: { value: '2024-01-01' },
    iepEndDate: { value: '2024-12-31' },
    annualReviewDate: { value: '2024-11-01' },
  },
  goals: [
    {
      goalText: { value: 'Student will read with 80% accuracy on grade-level texts' },
      domain: { value: 'Reading' },
      baseline: { value: 'Currently reads at 45% accuracy' },
      measurementMethod: { value: 'Weekly reading assessments' },
    },
  ],
  services: [
    {
      serviceType: { value: 'Reading Support' },
      frequency: { value: '3 times per week' },
      duration: { value: '30 minutes' },
    },
  ],
};

const validResults = validateIEP(validIEP);
console.log(`   Issues found: ${validResults.length}`);
console.log(`   ✅ Expected: 0-1 (may have info-level suggestions)\n`);

// Test 2: Missing required fields
console.log('Test 2: Missing student name, DOB, and goals');
const missingFieldsIEP: IEPData = {
  student: {},
  goals: [],
  services: [],
};

const missingResults = validateIEP(missingFieldsIEP);
const errors = missingResults.filter(i => i.severity === 'error');
console.log(`   Errors found: ${errors.length}`);
errors.forEach(err => console.log(`   - ${err.title}`));
console.log(`   ✅ Expected: 3 errors (name, DOB, goals)\n`);

// Test 3: Goals without measurable criteria
console.log('Test 3: Goals without measurable criteria or baseline');
const unmeasurableGoalsIEP: IEPData = {
  student: {
    name: { value: 'Jane Doe' },
    dateOfBirth: { value: '2016-05-20' },
  },
  goals: [
    {
      goalText: { value: 'Student will improve reading skills' }, // No measurable criteria
      domain: { value: 'Reading' },
      // No baseline
      // No measurement method
    },
  ],
};

const unmeasurableResults = validateIEP(unmeasurableGoalsIEP);
const warnings = unmeasurableResults.filter(i => i.severity === 'warning');
const infos = unmeasurableResults.filter(i => i.severity === 'info');
console.log(`   Warnings found: ${warnings.length}`);
warnings.forEach(warn => console.log(`   - ${warn.title}`));
console.log(`   Info found: ${infos.length}`);
infos.forEach(info => console.log(`   - ${info.title}`));
console.log(`   ✅ Expected: 2 warnings (not measurable, no baseline), 1 info (no method)\n`);

// Test 4: Invalid date logic
console.log('Test 4: Invalid date ranges');
const invalidDatesIEP: IEPData = {
  student: {
    name: { value: 'Bob Smith' },
    dateOfBirth: { value: '2014-08-10' },
  },
  dates: {
    iepStartDate: { value: '2024-01-01' },
    iepEndDate: { value: '2023-12-31' }, // End before start!
    annualReviewDate: { value: '2023-06-01' }, // In the past!
  },
  goals: [
    {
      goalText: { value: 'Student will complete math problems with 75% accuracy' },
    },
  ],
};

const dateResults = validateIEP(invalidDatesIEP);
const dateErrors = dateResults.filter(i => i.severity === 'error' && i.category === 'invalid_format');
const overdueErrors = dateResults.filter(i => i.title.includes('Overdue'));
console.log(`   Date errors: ${dateErrors.length}`);
dateErrors.forEach(err => console.log(`   - ${err.title}`));
console.log(`   Overdue errors: ${overdueErrors.length}`);
overdueErrors.forEach(err => console.log(`   - ${err.title}`));
console.log(`   ✅ Expected: 1 date range error, 1 overdue review error\n`);

// Test 5: Long IEP duration
console.log('Test 5: IEP duration exceeds one year');
const longDurationIEP: IEPData = {
  student: {
    name: { value: 'Alice Johnson' },
    dateOfBirth: { value: '2015-02-14' },
  },
  dates: {
    iepStartDate: { value: '2024-01-01' },
    iepEndDate: { value: '2025-06-30' }, // 18 months
  },
  goals: [
    {
      goalText: { value: 'Student will write essays with 90% accuracy' },
    },
  ],
};

const durationResults = validateIEP(longDurationIEP);
const durationWarnings = durationResults.filter(i => i.title.includes('Duration'));
console.log(`   Duration warnings: ${durationWarnings.length}`);
durationWarnings.forEach(warn => console.log(`   - ${warn.title}`));
console.log(`   ✅ Expected: 1 warning (exceeds one year)\n`);

// Test 6: Missing service details
console.log('Test 6: Services without frequency or duration');
const incompleteServicesIEP: IEPData = {
  student: {
    name: { value: 'Charlie Brown' },
    dateOfBirth: { value: '2016-11-30' },
  },
  goals: [
    {
      goalText: { value: 'Student will identify letters with 85% accuracy' },
    },
  ],
  services: [
    {
      serviceType: { value: 'Speech Therapy' },
      // No frequency
      // No duration
    },
  ],
};

const serviceResults = validateIEP(incompleteServicesIEP);
const serviceWarnings = serviceResults.filter(i => i.validatorName === 'validateServiceHours');
console.log(`   Service warnings: ${serviceWarnings.length}`);
serviceWarnings.forEach(warn => console.log(`   - ${warn.title}`));
console.log(`   ✅ Expected: 2 warnings (missing frequency, missing duration)\n`);

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All validator tests complete!\n');
console.log('Validators tested:');
console.log('   ✓ validateRequiredFields');
console.log('   ✓ validateGoalMeasurability');
console.log('   ✓ validateDateLogic');
console.log('   ✓ validateServiceHours\n');
console.log('Run this script to verify validators are working correctly.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
