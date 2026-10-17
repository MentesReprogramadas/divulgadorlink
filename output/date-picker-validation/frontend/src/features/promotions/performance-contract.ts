export type PerformanceTotals = { impressions: number; clicks: number; ctr: number; investmentCents: number | null; cpcCents: number | null }
export type PerformanceReport = {
  link: { id: string; name: string }; from: string; to: string; days: number; promotionId: string | null;
  totals: PerformanceTotals & { paidClicks: number };
  daily: Array<PerformanceTotals & { day: string; available: boolean; highlighted: boolean; paidClicks: number }>;
  surfaces: Array<PerformanceTotals & { surface: string }>;
  coverage: { status: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE'; availableFrom: string; investment: 'COMPLETE' | 'UNLINKED_HISTORY'; currentDayPartial: boolean };
  dataState: 'OUTSIDE_RETENTION' | 'RECORDED' | 'NO_EVENTS';
  comparison: { from: string; to: string; days: number; totals: PerformanceTotals; coverage: string };
  campaigns: Array<{ id: string; surface: string; status: string; activatedAt: string; expiresAt: string | null; administrative: boolean }>;
}
export type PerformanceFilters = { from?: string; to?: string; promotionId?: string }
