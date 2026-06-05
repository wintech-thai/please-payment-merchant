import OrgIdGuard from '@/components/OrgIdGuard'

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-hidden p-3 sm:p-6">
      <OrgIdGuard>{children}</OrgIdGuard>
    </div>
  )
}
