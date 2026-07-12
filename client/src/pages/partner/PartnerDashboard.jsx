import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatKES } from '../../lib/utils';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import ContributionsPanel from './components/ContributionsPanel';
import { getVerseOfTheDay } from '../../lib/bibleVerses';
import ReactECharts from 'echarts-for-react';

function SkeletonPulse({ className = '' }) {
  return <div className={`animate-pulse bg-surface-container-high rounded ${className}`} />;
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state lifted from ContributionsPanel so the server can filter the full dataset
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterPage, setFilterPage] = useState(1);
  const [filterTotal, setFilterTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: filterPage,
          limit: 20,
        };
        if (filterType) params.paymentType = filterType;
        if (filterStatus) params.status = filterStatus;
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo) {
          // Exclusive upper bound: first moment of day AFTER dateTo
          const exclusive = new Date(dateTo);
          exclusive.setDate(exclusive.getDate() + 1);
          params.endDate = exclusive.toISOString().split('T')[0];
        }

        const res = await api.get('/payments/my', { params });
        if (!cancelled) {
          const result = res.data.data || res.data;
          setData(result);
          setFilterTotal(result?.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load dashboard data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [filterType, filterStatus, dateFrom, dateTo, filterPage]);

  const firstName = user?.firstName || 'Partner';
  const summary = data?.summary || {};
  const payments = data?.payments || [];
  const totalContributions = (summary.totalTithes || 0) + (summary.totalOfferings || 0) + (summary.totalOther || 0);

  const monthlyTrend = summary.monthlyTrend || [];

  const hasChartData = monthlyTrend.length > 0 &&
    monthlyTrend.some((m) => (m.tithes || 0) + (m.offerings || 0) + (m.other || 0) > 0);

  const verse = getVerseOfTheDay();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-error mb-3 block" style={{ fontSize: 48 }}>
            error
          </span>
          <h2 className="text-headline-md text-on-surface mb-2">Something went wrong</h2>
          <p className="text-body-sm text-on-surface-variant mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto">
      {/* Hero Banner */}
      <section className="relative rounded-xl overflow-hidden h-48 flex items-center bg-primary-container card-shadow">
        <div className="absolute inset-0 z-0 opacity-30">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200&q=80')",
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent z-10" />
        <div className="relative z-20 px-10 space-y-2">
          <h2 className="text-headline-lg text-white">Welcome back, {firstName}</h2>
          <p className="text-body-lg text-primary-fixed-dim">
            Your faithful stewardship continues to build our community's future.
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 card-shadow">
              <SkeletonPulse className="h-4 w-24 mb-4" />
              <SkeletonPulse className="h-3 w-32 mb-2" />
              <SkeletonPulse className="h-6 w-28" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              icon="account_balance_wallet"
              iconBg="bg-secondary-container text-primary"
              label="Total Contributions"
              value={formatKES(totalContributions)}
              badge="YTD Total"
              badgeColor="text-secondary font-bold text-label-sm"
            />
            <KpiCard
              icon="volunteer_activism"
              iconBg="bg-secondary-container text-primary"
              label="Tithes"
              value={formatKES(summary.totalTithes || 0)}
              badge="Active Fund"
              badgeColor="text-secondary font-bold text-label-sm"
            />
            <KpiCard
              icon="spa"
              iconBg="bg-secondary-container text-primary"
              label="Offerings"
              value={formatKES(summary.totalOfferings || 0)}
              badge="Faithful Giving"
              badgeColor="text-on-surface-variant font-bold text-label-sm"
            />
            <KpiCard
              icon="foundation"
              iconBg="bg-secondary-container text-primary"
              label="Harambees"
              value={formatKES(summary.totalOther || 0)}
              badge="Building Fund"
              badgeColor="text-secondary font-bold text-label-sm"
            />
          </>
        )}
      </section>

      {/* Chart & Building Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/30 card-shadow">
          <div className="mb-8">
            <h4 className="text-headline-md text-on-surface">Giving Trend</h4>
            <p className="text-body-sm text-on-surface-variant">Last 6 months of your confirmed contributions</p>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <SkeletonPulse className="h-48 w-full" />
            </div>
          ) : !hasChartData ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-on-surface-variant mb-3 block" style={{ fontSize: 48 }}>
                inbox
              </span>
              <p className="text-body-lg text-on-surface-variant">No confirmed contributions yet</p>
              <Button className="mt-4" onClick={() => navigate('/partner/give')}>
                Make Your First Contribution
              </Button>
            </div>
          ) : (
            <ReactECharts
              notMerge={true}
              style={{ height: '280px', width: '100%' }}
              option={{
                grid: { left: 72, right: 24, top: 16, bottom: 48 },
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' },
                  formatter: (params) =>
                    `<strong>${params[0].name}</strong><br/>` +
                    params
                      .map(
                        (p) =>
                          `${p.marker} ${p.seriesName}: KES ${Number(p.value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
                      )
                      .join('<br/>'),
                },
                legend: {
                  data: ['Tithes', 'Offerings', 'Harambees'],
                  bottom: 0,
                  textStyle: { color: '#41493e', fontSize: 12 },
                },
                xAxis: {
                  type: 'category',
                  data: monthlyTrend.map((m) => m.month),
                  axisLine: { lineStyle: { color: '#c0c9bb' } },
                  axisTick: { show: false },
                  axisLabel: { color: '#41493e', fontSize: 11 },
                  splitLine: { show: false },
                },
                yAxis: {
                  type: 'value',
                  axisLabel: {
                    color: '#41493e',
                    fontSize: 11,
                    formatter: (v) =>
                      v >= 1000 ? `KES ${(v / 1000).toFixed(0)}k` : `KES ${v}`,
                  },
                  splitLine: { lineStyle: { color: '#f0eded', type: 'dashed' } },
                  axisLine: { show: false },
                },
                series: [
                  {
                    name: 'Tithes',
                    type: 'bar',
                    stack: 'total',
                    data: monthlyTrend.map((m) => m.tithes || 0),
                    itemStyle: { color: '#1b6d24' },
                    barMaxWidth: 48,
                    emphasis: { focus: 'series' },
                  },
                  {
                    name: 'Offerings',
                    type: 'bar',
                    stack: 'total',
                    data: monthlyTrend.map((m) => m.offerings || 0),
                    itemStyle: { color: '#a0f399' },
                    barMaxWidth: 48,
                    emphasis: { focus: 'series' },
                  },
                  {
                    name: 'Harambees',
                    type: 'bar',
                    stack: 'total',
                    data: monthlyTrend.map((m) => m.other || 0),
                    itemStyle: { color: '#c8e6c9', borderRadius: [4, 4, 0, 0] },
                    barMaxWidth: 48,
                    emphasis: { focus: 'series' },
                  },
                ],
              }}
            />
          )}
        </div>

        {/* Daily Bible Verse */}
        <div className="bg-primary-container p-8 rounded-xl card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-secondary-fixed" style={{ fontSize: 28 }}>auto_stories</span>
              <h4 className="text-headline-md text-white">Verse of the Day</h4>
            </div>
            <p className="text-label-sm text-primary-fixed font-semibold tracking-wide uppercase mb-3">{verse.reference}</p>
            <p className="text-body-lg text-white leading-relaxed italic">
              "{verse.text}"
            </p>
          </div>
          <button
            onClick={() => navigate('/partner/give')}
            className="w-full bg-white text-primary font-bold py-3 rounded-lg hover:bg-secondary-container transition-all active:scale-95 flex items-center justify-center gap-2 mt-8"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Make a Contribution
          </button>
        </div>
      </section>

      {/* Contributions Panel (replaces old Recent Transactions section) */}
      <ContributionsPanel
        payments={payments}
        loading={loading}
        total={filterTotal}
        page={filterPage}
        onPageChange={setFilterPage}
        filterType={filterType}
        filterStatus={filterStatus}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFilterType={(v) => { setFilterType(v); setFilterPage(1); }}
        onFilterStatus={(v) => { setFilterStatus(v); setFilterPage(1); }}
        onDateFrom={(v) => { setDateFrom(v); setFilterPage(1); }}
        onDateTo={(v) => { setDateTo(v); setFilterPage(1); }}
        onClearFilters={() => {
          setFilterType('');
          setFilterStatus('');
          setDateFrom('');
          setDateTo('');
          setFilterPage(1);
        }}
      />

      {/* Footer */}
      <footer className="text-center border-t border-outline-variant pt-6">
        <p className="text-label-sm text-on-surface-variant">
          © 2026 ChurchFinance Pro. Stewardship Through Transparency.
        </p>
      </footer>
    </div>
  );
}