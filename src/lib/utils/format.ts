/**
 * Formatting utilities for display
 */

import { format, formatDistance, parseISO } from 'date-fns';

/**
 * Format currency
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date: string | null | undefined, formatStr = 'MMM d, yyyy'): string {
  if (!date) return '-';
  try {
    return format(parseISO(date), formatStr);
  } catch {
    return '-';
  }
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return formatDistance(parseISO(date), new Date(), { addSuffix: true });
  } catch {
    return '-';
  }
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Truncate text
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Submission status
    submitted: 'bg-blue-100 text-blue-800',
    screening: 'bg-yellow-100 text-yellow-800',
    shortlisted: 'bg-purple-100 text-purple-800',
    rejected: 'bg-red-100 text-red-800',
    interview_scheduled: 'bg-indigo-100 text-indigo-800',
    offered: 'bg-green-100 text-green-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-800',

    // Project status
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    terminated: 'bg-red-100 text-red-800',
    on_hold: 'bg-yellow-100 text-yellow-800',

    // Invoice status
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',

    // Bench status
    available: 'bg-green-100 text-green-800',
    on_bench: 'bg-yellow-100 text-yellow-800',
    placed: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-100 text-gray-800',

    // Job status
    open: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
    filled: 'bg-blue-100 text-blue-800',
  };

  return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
