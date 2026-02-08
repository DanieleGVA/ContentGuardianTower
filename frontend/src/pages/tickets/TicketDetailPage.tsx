import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
  Lightbulb,
  FileText,
  History,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Breadcrumb, type BreadcrumbItem } from '../../components/ui/Breadcrumb';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs, TabsContent } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/Toast';
import { TICKET_STATUS, CHANNEL_ICON } from '../../lib/design-tokens';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserRef {
  id: string;
  username: string;
  fullName: string;
}

interface AnalysisResult {
  id: string;
  complianceStatus: string;
  violations: Array<{
    ruleVersionId: string;
    severitySnapshot: string;
    field: string;
    snippet: string;
    explanation: string;
    suggestion: string;
  }>;
  languageDetected: string | null;
}

interface TicketComment {
  id: string;
  body: string;
  createdAt: string;
  author: UserRef;
}

interface ContentRevision {
  id: string;
  revisionNumber: number;
  fetchedAt: string;
  textHash: string;
}

interface TicketEvent {
  id: string;
  eventType: string;
  actorType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  actor: UserRef | null;
}

interface TicketDetail {
  id: string;
  ticketKey: string;
  title: string;
  summary: string | null;
  status: string;
  riskLevel: string;
  escalationLevel: string;
  channel: string;
  countryCode: string;
  contentUrl: string | null;
  assigneeUserId: string | null;
  dueAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  source: { id: string; displayName: string; channel: string; platform: string } | null;
  assignee: UserRef | null;
  analysis: AnalysisResult | null;
  revision: ContentRevision | null;
  events: TicketEvent[];
  comments: TicketComment[];
  attachments: Array<{ id: string; fileName: string; mimeType: string; fileSizeBytes: number; createdAt: string; uploadedBy: UserRef }>;
}

/* ------------------------------------------------------------------ */
/*  Valid status transitions                                           */
/* ------------------------------------------------------------------ */

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
};

function getStatusOptions(currentStatus: string): { value: string; label: string }[] {
  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const options = [
    { value: currentStatus, label: TICKET_STATUS[currentStatus as keyof typeof TICKET_STATUS]?.label ?? currentStatus },
  ];
  for (const status of validNext) {
    const info = TICKET_STATUS[status as keyof typeof TICKET_STATUS];
    if (info) {
      options.push({ value: status, label: info.label });
    }
  }
  return options;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('evidence');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  async function handleStatusChange(newStatus: string) {
    if (!ticket || newStatus === ticket.status) return;
    try {
      setStatusUpdating(true);
      await api.put(`/tickets/${ticket.id}/status`, { status: newStatus });
      setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast({ title: `Status changed to ${TICKET_STATUS[newStatus as keyof typeof TICKET_STATUS]?.label ?? newStatus}`, variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast({ title: 'Status update failed', description: msg, variant: 'error' });
      setError(msg);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAssigneeChange(assigneeUserId: string) {
    if (!ticket) return;
    try {
      setAssigneeUpdating(true);
      await api.put(`/tickets/${ticket.id}/assign`, { assigneeUserId: assigneeUserId || null });
      toast({ title: 'Assignee updated', variant: 'success' });
      await fetchTicket();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update assignee';
      toast({ title: 'Assignment failed', description: msg, variant: 'error' });
      setError(msg);
    } finally {
      setAssigneeUpdating(false);
    }
  }

  async function handleCommentSubmit() {
    if (!ticket || !commentText.trim()) return;
    try {
      setCommentSubmitting(true);
      const newComment = await api.post<TicketComment>(`/tickets/${ticket.id}/comments`, {
        body: commentText.trim(),
      });
      setTicket((prev) =>
        prev ? { ...prev, comments: [...prev.comments, newComment] } : prev,
      );
      setCommentText('');
      toast({ title: 'Comment added', variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add comment';
      toast({ title: 'Comment failed', description: msg, variant: 'error' });
      setError(msg);
    } finally {
      setCommentSubmitting(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* ------ Breadcrumbs ------ */
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Tickets', href: '/tickets' },
    { label: ticket ? ticket.ticketKey : 'Loading...' },
  ];

  /* ------ Tab definitions ------ */
  const tabItems = [
    { value: 'evidence', label: 'Evidence', count: ticket?.analysis?.violations?.length },
    { value: 'revisions', label: 'Revisions' },
    { value: 'comments', label: 'Comments', count: ticket?.comments?.length },
    { value: 'attachments', label: 'Attachments', count: ticket?.attachments?.length },
    { value: 'history', label: 'History', count: ticket?.events?.length },
  ];

  /* ------ Loading state ------ */
  if (loading) {
    return (
      <AppLayout
        title="Ticket"
        breadcrumbs={<Breadcrumb items={breadcrumbItems} />}
      >
        <Card className="mb-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" variant="text" />
            <Skeleton className="h-4 w-96" variant="text" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-24" variant="rect" />
              <Skeleton className="h-8 w-24" variant="rect" />
              <Skeleton className="h-8 w-24" variant="rect" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16 mb-1" variant="text" />
                  <Skeleton className="h-5 w-28" variant="text" />
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" variant="rect" />
          ))}
        </div>
      </AppLayout>
    );
  }

  /* ------ Error state ------ */
  if (error && !ticket) {
    return (
      <AppLayout
        title="Ticket"
        breadcrumbs={<Breadcrumb items={breadcrumbItems} />}
      >
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="Failed to load ticket"
          description={error}
          action={{ label: 'Go to Tickets', onClick: () => navigate('/tickets') }}
        />
      </AppLayout>
    );
  }

  if (!ticket) return null;

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...(ticket.assignee ? [{ value: ticket.assignee.id, label: ticket.assignee.fullName }] : []),
  ];

  return (
    <AppLayout
      title={ticket.ticketKey}
      breadcrumbs={<Breadcrumb items={breadcrumbItems} />}
    >
      {/* Inline error */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ------ Header Card ------ */}
      <Card className="mb-6">
        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-medium text-text-secondary">
              {ticket.ticketKey}
            </span>
            <h1 className="mt-1 text-lg font-bold text-text-primary">{ticket.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="risk" value={ticket.riskLevel} />
            {ticket.escalationLevel !== 'LOCAL' && (
              <Badge variant="escalation" value={ticket.escalationLevel} />
            )}
            {ticket.isOverdue && (
              <Badge
                variant="custom"
                value="Overdue"
                className="bg-red-100 text-red-700"
                icon={<Clock className="h-3 w-3" />}
              />
            )}
          </div>
        </div>

        {/* Status + Assignee dropdowns */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              label="Status"
              options={getStatusOptions(ticket.status)}
              value={ticket.status}
              onValueChange={handleStatusChange}
              disabled={statusUpdating}
            />
          </div>
          <div className="w-56">
            <Select
              label="Assignee"
              options={assigneeOptions}
              value={ticket.assigneeUserId ?? ''}
              onValueChange={handleAssigneeChange}
              disabled={assigneeUpdating}
              placeholder="Unassigned"
            />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-border pt-4 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-text-secondary">Channel</p>
            <p className="mt-0.5 text-sm text-text-primary">
              {CHANNEL_ICON[ticket.channel] ?? ''} {ticket.channel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary">Country</p>
            <p className="mt-0.5 text-sm text-text-primary">{ticket.countryCode}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary">Source</p>
            <p className="mt-0.5 text-sm text-text-primary">{ticket.source?.displayName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary">Created</p>
            <p className="mt-0.5 text-sm text-text-primary">{formatDate(ticket.createdAt)}</p>
          </div>
          {ticket.contentUrl && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-text-secondary">Content URL</p>
              <a
                href={ticket.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {ticket.contentUrl}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {ticket.dueAt && (
            <div>
              <p className="text-xs font-medium text-text-secondary">Due</p>
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  ticket.isOverdue ? 'font-semibold text-red-600' : 'text-text-primary',
                )}
              >
                {formatDate(ticket.dueAt)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ------ Tabs ------ */}
      <Tabs tabs={tabItems} value={activeTab} onValueChange={setActiveTab}>
        {/* Evidence Tab */}
        <TabsContent value="evidence">
          {!ticket.analysis?.violations?.length ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No evidence"
              description="No compliance violations were detected for this ticket."
            />
          ) : (
            <div className="space-y-4">
              {ticket.analysis.violations.map((ev, idx) => (
                <Card key={idx} className="border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        Rule Version: {ev.ruleVersionId}
                      </h3>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Severity: {ev.severitySnapshot}
                      </p>
                    </div>
                    <Badge
                      variant="custom"
                      value={ev.field}
                      className="bg-gray-100 text-text-secondary"
                    />
                  </div>

                  {/* Snippet */}
                  {ev.snippet && (
                    <div className="mt-3 rounded-md bg-gray-50 border border-border p-3">
                      <p className="text-xs font-medium text-text-secondary mb-1">Snippet</p>
                      <p className="text-sm text-text-primary font-mono whitespace-pre-wrap">
                        {ev.snippet}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="mt-3 flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-risk-high" />
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Explanation</p>
                      <p className="mt-0.5 text-sm text-text-primary">{ev.explanation}</p>
                    </div>
                  </div>

                  {/* Suggestion */}
                  {ev.suggestion && (
                    <div className="mt-3 flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <div>
                        <p className="text-xs font-medium text-text-secondary">Suggestion</p>
                        <p className="mt-0.5 text-sm text-text-primary">{ev.suggestion}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Revisions Tab */}
        <TabsContent value="revisions">
          {!ticket.revision ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No revisions"
              description="No content revisions have been recorded yet."
            />
          ) : (
            <div className="space-y-3">
              <Card className="border border-border">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-text-secondary">
                    v{ticket.revision.revisionNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Revision {ticket.revision.revisionNumber}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDate(ticket.revision.fetchedAt)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <div className="space-y-4">
            {ticket.comments.length === 0 && (
              <p className="py-4 text-center text-sm text-text-secondary">
                No comments yet. Be the first to add one.
              </p>
            )}

            {ticket.comments.map((comment) => (
              <Card key={comment.id} className="border border-border">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(comment.author?.fullName ?? 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {comment.author?.fullName ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-primary whitespace-pre-wrap">
                  {comment.body}
                </p>
              </Card>
            ))}

            {/* Add comment form */}
            <Card className="border border-border">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Add a comment</h3>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write your comment..."
                rows={3}
                disabled={commentSubmitting}
                className={cn(
                  'mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary',
                  'placeholder:text-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  'resize-y',
                )}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCommentSubmit}
                  loading={commentSubmitting}
                  disabled={!commentText.trim()}
                >
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <div className="space-y-4">
            {(!ticket.attachments || ticket.attachments.length === 0) && (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No attachments"
                description="No files have been attached to this ticket yet."
              />
            )}

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="space-y-3">
                {ticket.attachments.map((att) => (
                  <Card key={att.id} className="border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-text-secondary" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{att.fileName}</p>
                          <p className="text-xs text-text-secondary">
                            {(att.fileSizeBytes / 1024).toFixed(1)} KB &middot; {att.mimeType} &middot; {formatDate(att.createdAt)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/tickets/${ticket.id}/attachments/${att.id}/download`}
                        className="text-sm font-medium text-primary hover:underline"
                        download
                      >
                        Download
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {ticket.events.length === 0 ? (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="No history"
              description="No events have been recorded for this ticket yet."
            />
          ) : (
            <div className="relative ml-4 border-l-2 border-border pl-6">
              {ticket.events.map((event, index) => (
                <div
                  key={event.id}
                  className={cn('relative pb-6', index === ticket.events.length - 1 && 'pb-0')}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[calc(1.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-white" />

                  <div>
                    <p className="text-sm font-medium text-text-primary">{event.eventType}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {event.actor?.fullName ?? event.actorType} &middot; {formatDate(event.createdAt)}
                    </p>
                    {event.fromStatus && event.toStatus && (
                      <p className="mt-1 text-sm text-text-secondary">
                        {event.fromStatus} → {event.toStatus}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
