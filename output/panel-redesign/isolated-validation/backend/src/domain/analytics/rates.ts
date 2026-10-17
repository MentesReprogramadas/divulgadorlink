export function ctr(clicks: number, impressions: number): number {
  return impressions === 0 ? 0 : clicks / impressions * 100
}
