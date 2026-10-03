import { AISummary, EmergencyHospital, Reminder } from '../api';

export function settledFailureMessage(
  results: Array<[string, PromiseSettledResult<unknown>]>,
): string {
  return results
    .filter((entry): entry is [string, PromiseRejectedResult] => entry[1].status === 'rejected')
    .map(([label, result]) => (
      `${label}: ${result.reason instanceof Error ? result.reason.message : 'request failed'}`
    ))
    .join('; ');
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString();
}

export function formatSummary(summary?: AISummary | null): string {
  if (!summary) return 'No SOAP summary available yet.';
  return [
    `Subjective: ${summary.subjective || 'Not documented'}`,
    `Objective: ${summary.objective || 'Not documented'}`,
    `Assessment: ${summary.assessment || 'Not documented'}`,
    `Plan: ${summary.plan || 'Not documented'}`,
  ].join('\n\n');
}

export function formatReportAnalysis(parsedData?: string | null): string {
  if (!parsedData) return '';

  try {
    const data = JSON.parse(parsedData) as Record<string, any>;
    // The Gemini JSON is nested under the 'analysis' key
    const analysis = data.analysis || data;
    const summary = analysis.clinical_summary || {};

    // Show only the overall clinical snapshot
    const snapshot = typeof summary.overall_clinical_snapshot === 'string'
      ? summary.overall_clinical_snapshot
      : '';

    return snapshot || 'Analysis complete. No summary found.';
  } catch {
    return parsedData || '';
  }
}

export function reminderLabel(reminder: Reminder): string {
  const due = new Date(reminder.time);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.round((startDue - startToday) / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 2) return `In ${days} days`;
  return formatDate(reminder.time);
}

export function isUrgent(reminder: Reminder): boolean {
  const text = reminder.message.toLowerCase();
  return text.includes('urgent') || reminderLabel(reminder) === 'Overdue' || reminderLabel(reminder) === 'Due today';
}

export function formatDistance(meters?: number | null): string {
  if (!meters && meters !== 0) return 'Distance unavailable';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km away`;
  return `${Math.round(meters)} m away`;
}

export function openStatus(hospital: EmergencyHospital): string {
  if (hospital.is_open === true) return 'Open now';
  if (hospital.is_open === false) return 'May be closed';
  return hospital.opening_hours ? `Hours: ${hospital.opening_hours}` : 'Open status not listed';
}
