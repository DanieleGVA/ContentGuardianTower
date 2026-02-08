import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { KpiCard } from '../components/ui/KpiCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api-client';
import { TICKET_STATUS, RISK_LEVEL, CHANNEL_ICON } from '../lib/design-tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LatestTicket {
  id: string;
  ticketKey: string;
  title: string;
  status: keyof typeof TICKET_STATUS;
  riskLevel: keyof typeof RISK_LEVEL;
  channel: string;
  countryCode: string;
  createdAt: string;
  source?: { id: string; displayName: string; channel: string };
  assignee?: { id: string; username: string; fullName: string } | null;
}

interface DashboardKpis {
  ticketsByStatus: Record<string, number>;
  ticketsByRisk: Record<string, number>;
  ticketsByEscalation: Record<string, number>;
  recentActivity: {
    newTickets24h: number;
    resolvedTickets24h: number;
    escalatedTickets: number;
    overdueTickets: number;
  };
  latestTickets: LatestTicket[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchKpis() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.get<DashboardKpis>('/dashboard/kpis');
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchKpis();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout title="Dashboard">
      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ------ KPI Cards: Status Row ------ */}
      <section aria-label="Ticket status overview">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          By Status
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card-bg p-5">
                <Skeleton variant="circle" width={40} height={40} />
                <Skeleton className="mt-3 h-8 w-16" variant="text" />
                <Skeleton className="mt-1 h-4 w-24" variant="text" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                icon={<span className="text-lg">{TICKET_STATUS.OPEN.icon}</span>}
                label="Open"
                value={data?.ticketsByStatus?.OPEN ?? 0}
                color={TICKET_STATUS.OPEN.color}
                onClick={() => navigate('/tickets?status=OPEN')}
              />
              <KpiCard
                icon={<span className="text-lg">{TICKET_STATUS.IN_PROGRESS.icon}</span>}
                label="In Progress"
                value={data?.ticketsByStatus?.IN_PROGRESS ?? 0}
                color={TICKET_STATUS.IN_PROGRESS.color}
                onClick={() => navigate('/tickets?status=IN_PROGRESS')}
              />
              <KpiCard
                icon={<span className="text-lg">{TICKET_STATUS.RESOLVED.icon}</span>}
                label="Resolved"
                value={data?.ticketsByStatus?.RESOLVED ?? 0}
                color={TICKET_STATUS.RESOLVED.color}
                onClick={() => navigate('/tickets?status=RESOLVED')}
              />
              <KpiCard
                icon={<span className="text-lg">{TICKET_STATUS.CLOSED.icon}</span>}
                label="Closed"
                value={data?.ticketsByStatus?.CLOSED ?? 0}
                color={TICKET_STATUS.CLOSED.color}
                onClick={() => navigate('/tickets?status=CLOSED')}
              />
            </>
          )}
        </div>
      </section>

      {/* ------ KPI Cards: Risk + Escalated Row ------ */}
      <section aria-label="Risk level overview" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          By Risk Level
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card-bg p-5">
                <Skeleton variant="circle" width={40} height={40} />
                <Skeleton className="mt-3 h-8 w-16" variant="text" />
                <Skeleton className="mt-1 h-4 w-24" variant="text" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                icon={<span className="text-lg">{RISK_LEVEL.HIGH.icon}</span>}
                label="High Risk"
                value={data?.ticketsByRisk?.HIGH ?? 0}
                color={RISK_LEVEL.HIGH.color}
                onClick={() => navigate('/tickets?riskLevel=HIGH')}
              />
              <KpiCard
                icon={<span className="text-lg">{RISK_LEVEL.MEDIUM.icon}</span>}
                label="Medium Risk"
                value={data?.ticketsByRisk?.MEDIUM ?? 0}
                color={RISK_LEVEL.MEDIUM.color}
                onClick={() => navigate('/tickets?riskLevel=MEDIUM')}
              />
              <KpiCard
                icon={<span className="text-lg">{RISK_LEVEL.LOW.icon}</span>}
                label="Low Risk"
                value={data?.ticketsByRisk?.LOW ?? 0}
                color={RISK_LEVEL.LOW.color}
                onClick={() => navigate('/tickets?riskLevel=LOW')}
              />
              <KpiCard
                icon={<span className="text-lg">&#8593;&#8593;</span>}
                label="Escalated"
                value={data?.recentActivity?.escalatedTickets ?? 0}
                color="text-escalation-global"
                onClick={() => navigate('/tickets?escalated=true')}
              />
            </>
          )}
        </div>
      </section>

      {/* ------ Recent Activity (24h) ------ */}
      <section aria-label="Recent activity" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Last 24 Hours
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card-bg p-5">
                <Skeleton className="h-8 w-12" variant="text" />
                <Skeleton className="mt-2 h-4 w-28" variant="text" />
              </div>
            ))
          ) : (
            <>
              <Card>
                <p className="text-2xl font-bold text-text-primary">
                  {data?.recentActivity?.newTickets24h ?? 0}
                </p>
                <p className="mt-1 text-xs font-medium text-text-secondary">New Tickets</p>
              </Card>
              <Card>
                <p className="text-2xl font-bold text-status-resolved">
                  {data?.recentActivity?.resolvedTickets24h ?? 0}
                </p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Resolved</p>
              </Card>
              <Card>
                <p className="text-2xl font-bold text-escalation-regional">
                  {data?.recentActivity?.escalatedTickets ?? 0}
                </p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Escalated</p>
              </Card>
              <Card>
                <p className="text-2xl font-bold text-red-600">
                  {data?.recentActivity?.overdueTickets ?? 0}
                </p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Overdue</p>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* ------ Latest Tickets ------ */}
      <section aria-label="Latest tickets" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Latest Tickets
          </h2>
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>

        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-20" variant="text" />
                  <Skeleton className="h-4 w-48 flex-1" variant="text" />
                  <Skeleton className="h-5 w-16" variant="rect" />
                  <Skeleton className="h-5 w-16" variant="rect" />
                  <Skeleton className="h-4 w-6" variant="text" />
                  <Skeleton className="h-4 w-12" variant="text" />
                </div>
              ))}
            </div>
          ) : !data?.latestTickets.length ? (
            <div className="px-6 py-12 text-center text-sm text-text-secondary">
              No tickets found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.latestTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-[5rem] text-xs font-mono font-medium text-text-secondary">
                    {ticket.ticketKey}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-text-primary">
                    {ticket.title}
                  </span>
                  <Badge variant="status" value={ticket.status} />
                  <Badge variant="risk" value={ticket.riskLevel} />
                  <span className="text-base" title={ticket.channel}>
                    {CHANNEL_ICON[ticket.channel] ?? ticket.channel}
                  </span>
                  <span className="min-w-[2.5rem] text-xs text-text-secondary">
                    {ticket.countryCode}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>
    </AppLayout>
  );
}
