/**
 * Timeline Data Aggregation Utility
 * Combines data from multiple sources for entity timeline views
 */

import { supabase } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';

export interface TimelineItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
  color?: string;
  metadata?: any;
  user?: {
    username: string;
    email: string;
  };
  navigationUrl?: string;
  navigationLabel?: string;
}

/**
 * Get complete timeline for a candidate
 */
export async function getCandidateTimeline(candidateId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Get audit logs
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'candidates')
    .eq('entity_id', candidateId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: `${log.action} Action`,
        description: `${log.action} candidate record`,
        timestamp: log.performed_at,
        icon: 'history',
        color: 'blue',
        metadata: { changedFields: log.changed_fields },
        user: log.performed_by_user,
      }))
    );
  }

  // Get activities
  const { data: activities } = await supabase
    .from('activities')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'candidate')
    .eq('entity_id', candidateId)
    .order('created_at', { ascending: false });

  if (activities) {
    timeline.push(
      ...activities.map((activity: any) => ({
        id: activity.activity_id,
        type: 'activity',
        title: activity.activity_title,
        description: activity.activity_description || '',
        timestamp: activity.created_at,
        icon: 'activity',
        color: 'green',
        metadata: activity.metadata,
        user: activity.created_by_user,
      }))
    );
  }

  // Get notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'candidate')
    .eq('entity_id', candidateId)
    .order('created_at', { ascending: false });

  if (notes) {
    timeline.push(
      ...notes.map((note: any) => ({
        id: note.note_id,
        type: 'note',
        title: `Note: ${note.note_type}`,
        description: note.note_text,
        timestamp: note.created_at,
        icon: 'note',
        color: note.is_pinned ? 'yellow' : 'gray',
        metadata: { noteType: note.note_type, isPinned: note.is_pinned },
        user: note.created_by_user,
      }))
    );
  }

  // Get submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, job:job_requirements(job_title), submitted_by:users(username, email)')
    .eq('candidate_id', candidateId)
    .order('submitted_at', { ascending: false });

  if (submissions) {
    timeline.push(
      ...submissions.map((submission: any) => ({
        id: submission.submission_id,
        type: 'submission',
        title: 'Submission Created',
        description: `Submitted for ${submission.job?.job_title || 'Unknown Position'}`,
        timestamp: submission.submitted_at,
        icon: 'send',
        color: 'purple',
        metadata: {
          status: submission.submission_status,
          billRate: submission.bill_rate_offered,
          payRate: submission.pay_rate_offered,
        },
        user: submission.submitted_by,
        navigationUrl: `/submissions/${submission.submission_id}`,
        navigationLabel: 'View submission',
      }))
    );
  }

  // Get interviews
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, submission:submissions(job_id, job:job_requirements(job_title))')
    .eq('submission.candidate_id', candidateId)
    .order('scheduled_time', { ascending: false });

  if (interviews) {
    timeline.push(
      ...interviews.map((interview: any) => ({
        id: interview.interview_id,
        type: 'interview',
        title: `Interview ${interview.interview_round || ''}`,
        description: `${interview.interview_mode || ''} interview - Result: ${interview.result || 'Pending'}`,
        timestamp: interview.scheduled_time || interview.created_at,
        icon: 'calendar',
        color: interview.result === 'Passed' ? 'green' : interview.result === 'Failed' ? 'red' : 'blue',
        metadata: {
          round: interview.interview_round,
          mode: interview.interview_mode,
          result: interview.result,
          rating: interview.rating,
        },
        navigationUrl: interview.submission?.job_id ? `/requirements/${interview.submission.job_id}` : undefined,
        navigationLabel: 'View job requirement',
      }))
    );
  }

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*, client:clients(client_name)')
    .eq('candidate_id', candidateId)
    .order('start_date', { ascending: false });

  if (projects) {
    timeline.push(
      ...projects.map((project: any) => ({
        id: project.project_id,
        type: 'project',
        title: 'Project Started',
        description: `Started project with ${project.client?.client_name || 'Unknown Client'}`,
        timestamp: project.start_date,
        icon: 'briefcase',
        color: 'indigo',
        metadata: {
          status: project.status,
          billRate: project.bill_rate_final,
          payRate: project.pay_rate_final,
          endDate: project.end_date,
        },
        navigationUrl: `/projects/${project.project_id}`,
        navigationLabel: 'View project',
      }))
    );
  }

  // Get bench history
  const { data: benchHistory } = await supabase
    .from('bench_history')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('bench_added_date', { ascending: false });

  if (benchHistory) {
    benchHistory.forEach((bench: any) => {
      timeline.push({
        id: `${bench.bench_id}-add`,
        type: 'bench',
        title: 'Added to Bench',
        description: bench.notes || 'Candidate added to bench',
        timestamp: bench.bench_added_date,
        icon: 'user-minus',
        color: 'orange',
        metadata: { action: 'added' },
      });

      if (bench.bench_removed_date) {
        timeline.push({
          id: `${bench.bench_id}-remove`,
          type: 'bench',
          title: 'Removed from Bench',
          description: bench.reason_bench_out || 'Candidate removed from bench',
          timestamp: bench.bench_removed_date,
          icon: 'user-check',
          color: 'green',
          metadata: { action: 'removed' },
        });
      }
    });
  }

  // Get attachments
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*, uploaded_by_user:users(username, email)')
    .eq('entity_type', 'candidate')
    .eq('entity_id', candidateId)
    .order('uploaded_at', { ascending: false });

  if (attachments) {
    timeline.push(
      ...attachments.map((attachment: any) => ({
        id: attachment.attachment_id,
        type: 'attachment',
        title: 'File Uploaded',
        description: `Uploaded ${attachment.file_name}`,
        timestamp: attachment.uploaded_at,
        icon: 'file',
        color: 'gray',
        metadata: {
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
        },
        user: attachment.uploaded_by_user,
      }))
    );
  }

  // Sort timeline by timestamp (most recent first)
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

/**
 * Get timeline for vendors
 */
export async function getVendorTimeline(vendorId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Audit logs
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'vendors')
    .eq('entity_id', vendorId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: `${log.action} Action`,
        description: `${log.action} vendor record`,
        timestamp: log.performed_at,
        icon: 'history',
        color: 'blue',
        user: log.performed_by_user,
      }))
    );
  }

  // Activities
  const { data: activities } = await supabase
    .from('activities')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'vendor')
    .eq('entity_id', vendorId)
    .order('created_at', { ascending: false });

  if (activities) {
    timeline.push(
      ...activities.map((activity: any) => ({
        id: activity.activity_id,
        type: 'activity',
        title: activity.activity_title,
        description: activity.activity_description || '',
        timestamp: activity.created_at,
        icon: 'activity',
        color: 'green',
        metadata: activity.metadata,
        user: activity.created_by_user,
      }))
    );
  }

  // Notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'vendor')
    .eq('entity_id', vendorId)
    .order('created_at', { ascending: false });

  if (notes) {
    timeline.push(
      ...notes.map((note: any) => ({
        id: note.note_id,
        type: 'note',
        title: `Note: ${note.note_type}`,
        description: note.note_text,
        timestamp: note.created_at,
        icon: 'note',
        color: note.is_pinned ? 'yellow' : 'gray',
        metadata: { noteType: note.note_type, isPinned: note.is_pinned },
        user: note.created_by_user,
      }))
    );
  }

  // Attachments
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*, uploaded_by_user:users(username, email)')
    .eq('entity_type', 'vendor')
    .eq('entity_id', vendorId)
    .order('uploaded_at', { ascending: false });

  if (attachments) {
    timeline.push(
      ...attachments.map((attachment: any) => ({
        id: attachment.attachment_id,
        type: 'attachment',
        title: 'File Uploaded',
        description: `Uploaded ${attachment.file_name}`,
        timestamp: attachment.uploaded_at,
        icon: 'file',
        color: 'gray',
        metadata: {
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
        },
        user: attachment.uploaded_by_user,
      }))
    );
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

/**
 * Get timeline for clients
 */
export async function getClientTimeline(clientId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Audit logs
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'clients')
    .eq('entity_id', clientId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: `${log.action} Action`,
        description: `${log.action} client record`,
        timestamp: log.performed_at,
        icon: 'history',
        color: 'blue',
        user: log.performed_by_user,
      }))
    );
  }

  // Activities
  const { data: activities } = await supabase
    .from('activities')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false });

  if (activities) {
    timeline.push(
      ...activities.map((activity: any) => ({
        id: activity.activity_id,
        type: 'activity',
        title: activity.activity_title,
        description: activity.activity_description || '',
        timestamp: activity.created_at,
        icon: 'activity',
        color: 'green',
        metadata: activity.metadata,
        user: activity.created_by_user,
      }))
    );
  }

  // Notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false });

  if (notes) {
    timeline.push(
      ...notes.map((note: any) => ({
        id: note.note_id,
        type: 'note',
        title: `Note: ${note.note_type}`,
        description: note.note_text,
        timestamp: note.created_at,
        icon: 'note',
        color: note.is_pinned ? 'yellow' : 'gray',
        metadata: { noteType: note.note_type, isPinned: note.is_pinned },
        user: note.created_by_user,
      }))
    );
  }

  // Attachments
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*, uploaded_by_user:users(username, email)')
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('uploaded_at', { ascending: false });

  if (attachments) {
    timeline.push(
      ...attachments.map((attachment: any) => ({
        id: attachment.attachment_id,
        type: 'attachment',
        title: 'File Uploaded',
        description: `Uploaded ${attachment.file_name}`,
        timestamp: attachment.uploaded_at,
        icon: 'file',
        color: 'gray',
        metadata: {
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
        },
        user: attachment.uploaded_by_user,
      }))
    );
  }

  // Job Requirements for this client
  const { data: jobRequirements } = await supabase
    .from('job_requirements')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (jobRequirements) {
    timeline.push(
      ...jobRequirements.map((job: any) => ({
        id: job.job_id,
        type: 'job_requirement',
        title: 'New Job Requirement',
        description: `Job posted: ${job.job_title}`,
        timestamp: job.created_at,
        icon: 'briefcase',
        color: 'purple',
        metadata: {
          jobTitle: job.job_title,
          status: job.status,
          priority: job.priority,
        },
        navigationUrl: `/requirements/${job.job_id}`,
        navigationLabel: 'View job requirement',
      }))
    );
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

/**
 * Get timeline for submissions
 */
export async function getSubmissionTimeline(submissionId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Get submission status changes from audit log
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'submissions')
    .eq('entity_id', submissionId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: `Status Updated`,
        description: log.changed_fields?.includes('submission_status')
          ? `Status changed to ${log.new_value_json?.submission_status}`
          : `Updated submission`,
        timestamp: log.performed_at,
        icon: 'edit',
        color: 'blue',
        user: log.performed_by_user,
      }))
    );
  }

  // Get interviews for this submission
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('submission_id', submissionId)
    .order('scheduled_time', { ascending: false });

  if (interviews) {
    timeline.push(
      ...interviews.map((interview: any) => ({
        id: interview.interview_id,
        type: 'interview',
        title: `Interview ${interview.interview_round || ''}`,
        description: `${interview.interview_mode || ''} - Result: ${interview.result || 'Pending'}`,
        timestamp: interview.scheduled_time || interview.created_at,
        icon: 'calendar',
        color: 'purple',
        metadata: { result: interview.result, mode: interview.interview_mode },
      }))
    );
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

/**
 * Get timeline for projects
 */
export async function getProjectTimeline(projectId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Audit logs
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'projects')
    .eq('entity_id', projectId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: 'Project Updated',
        description: `Updated ${log.changed_fields?.join(', ') || 'project'}`,
        timestamp: log.performed_at,
        icon: 'edit',
        color: 'blue',
        user: log.performed_by_user,
      }))
    );
  }

  // Timesheets
  const { data: timesheets } = await supabase
    .from('timesheets')
    .select('*')
    .eq('project_id', projectId)
    .order('week_start', { ascending: false });

  if (timesheets) {
    timeline.push(
      ...timesheets.map((timesheet: any) => ({
        id: timesheet.timesheet_id,
        type: 'timesheet',
        title: 'Timesheet Submitted',
        description: `${timesheet.hours_worked} hours for week ${format(parseISO(timesheet.week_start), 'MMM d, yyyy')}`,
        timestamp: timesheet.submitted_date || timesheet.created_at,
        icon: 'clock',
        color: timesheet.approved_by_client ? 'green' : 'yellow',
        metadata: {
          hours: timesheet.hours_worked,
          approved: timesheet.approved_by_client,
        },
        navigationUrl: `/timesheets/${timesheet.timesheet_id}`,
        navigationLabel: 'View timesheet',
      }))
    );
  }

  // Invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('invoice_date', { ascending: false });

  if (invoices) {
    timeline.push(
      ...invoices.map((invoice: any) => ({
        id: invoice.invoice_id,
        type: 'invoice',
        title: 'Invoice Generated',
        description: `Invoice ${invoice.invoice_number} for $${invoice.invoice_amount}`,
        timestamp: invoice.invoice_date,
        icon: 'dollar-sign',
        color: invoice.status === 'paid' ? 'green' : 'orange',
        metadata: {
          invoiceNumber: invoice.invoice_number,
          amount: invoice.invoice_amount,
          status: invoice.status,
        },
        navigationUrl: `/invoices/${invoice.invoice_id}`,
        navigationLabel: 'View invoice',
      }))
    );
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

/**
 * Get timeline for job requirements
 */
export async function getJobRequirementTimeline(jobId: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = [];

  // Audit logs
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', 'job_requirements')
    .eq('entity_id', jobId)
    .order('performed_at', { ascending: false });

  if (auditLogs) {
    timeline.push(
      ...auditLogs.map((log: any) => ({
        id: log.audit_id,
        type: 'audit',
        title: `${log.action} Action`,
        description: `${log.action} job requirement record`,
        timestamp: log.performed_at,
        icon: 'history',
        color: 'blue',
        user: log.performed_by_user,
      }))
    );
  }

  // Activities
  const { data: activities } = await supabase
    .from('activities')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'job_requirement')
    .eq('entity_id', jobId)
    .order('created_at', { ascending: false });

  if (activities) {
    timeline.push(
      ...activities.map((activity: any) => ({
        id: activity.activity_id,
        type: 'activity',
        title: activity.activity_title,
        description: activity.activity_description || '',
        timestamp: activity.created_at,
        icon: 'activity',
        color: 'green',
        metadata: activity.metadata,
        user: activity.created_by_user,
      }))
    );
  }

  // Notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', 'job_requirement')
    .eq('entity_id', jobId)
    .order('created_at', { ascending: false });

  if (notes) {
    timeline.push(
      ...notes.map((note: any) => ({
        id: note.note_id,
        type: 'note',
        title: `Note: ${note.note_type}`,
        description: note.note_text,
        timestamp: note.created_at,
        icon: 'note',
        color: note.is_pinned ? 'yellow' : 'gray',
        metadata: { noteType: note.note_type, isPinned: note.is_pinned },
        user: note.created_by_user,
      }))
    );
  }

  // Attachments
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*, uploaded_by_user:users(username, email)')
    .eq('entity_type', 'job_requirement')
    .eq('entity_id', jobId)
    .order('uploaded_at', { ascending: false });

  if (attachments) {
    timeline.push(
      ...attachments.map((attachment: any) => ({
        id: attachment.attachment_id,
        type: 'attachment',
        title: 'File Uploaded',
        description: `Uploaded ${attachment.file_name}`,
        timestamp: attachment.uploaded_at,
        icon: 'file',
        color: 'gray',
        metadata: {
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
        },
        user: attachment.uploaded_by_user,
      }))
    );
  }

  // Submissions for this job
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      candidate:candidates(first_name, last_name)
    `)
    .eq('job_id', jobId)
    .order('submitted_at', { ascending: false });

  if (submissions) {
    timeline.push(
      ...submissions.map((submission: any) => ({
        id: submission.submission_id,
        type: 'submission',
        title: 'Candidate Submitted',
        description: `${submission.candidate?.first_name} ${submission.candidate?.last_name} submitted - Status: ${submission.submission_status}`,
        timestamp: submission.submitted_at,
        icon: 'user-check',
        color: 'purple',
        metadata: {
          candidateId: submission.candidate_id,
          status: submission.submission_status,
        },
        navigationUrl: `/submissions/${submission.submission_id}`,
        navigationLabel: 'View submission',
      }))
    );
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}
