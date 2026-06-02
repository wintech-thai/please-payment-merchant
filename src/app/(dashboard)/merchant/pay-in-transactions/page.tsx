export default function PayInTransactionsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pay-In Transactions</h2>
          <p className="text-sm text-gray-400 mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
