import ReportSidebar from '@/components/ReportSidebar'
import OrgIdGuard from '@/components/OrgIdGuard'

export default function ReportAnalyticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <ReportSidebar />
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <OrgIdGuard>{children}</OrgIdGuard>
      </div>
    </div>
  )
}
