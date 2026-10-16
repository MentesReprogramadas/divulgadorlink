import { ReportSubmissionScreen } from '@/features/moderation/report-submission-screen'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReportSubmissionScreen linkId={id} />
}
