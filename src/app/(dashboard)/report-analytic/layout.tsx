import ReportSidebar from '@/components/ReportSidebar'
import OrgIdGuard from '@/components/OrgIdGuard'

export default function ReportAnalyticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <ReportSidebar />
      <div className="flex-1 overflow-hidden">
        <OrgIdGuard>{children}</OrgIdGuard>
      </div>
    </div>
  )
}
