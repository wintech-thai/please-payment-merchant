import AdministrationSidebar from '@/components/AdministrationSidebar'
import OrgIdGuard from '@/components/OrgIdGuard'

export default function AdministrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <AdministrationSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        <OrgIdGuard>{children}</OrgIdGuard>
      </div>
    </div>
  )
}
