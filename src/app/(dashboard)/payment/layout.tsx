import PaymentSidebar from '@/components/PaymentSidebar'
import OrgIdGuard from '@/components/OrgIdGuard'

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <PaymentSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        <OrgIdGuard>{children}</OrgIdGuard>
      </div>
    </div>
  )
}
