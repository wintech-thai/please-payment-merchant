// ─── User ───────────────────────────────────────────────────────────────────

export interface UserItem {
  adminUserId: string
  userId: string
  userName: string
  userEmail: string
  tmpUserEmail?: string | null
  userStatus: string          // "Active" | "Disabled" | "Pending" etc.
  previousUserStatus?: string | null
  createdDate?: string | null
  invitedDate?: string | null
  invitedBy?: string | null
  rolesList?: string | null   // comma-separated string e.g. "Admin,User,OWNER"
  roles?: unknown[]
  customRoleId?: string | null
  customRoleName?: string | null
  customRoleDesc?: string | null
  tags?: string | null        // comma-separated string e.g. "test,local"
  isOrgInitialUser?: string | null  // "YES" | "NO"
}

export interface GetUsersPayload {
  search?: string
  fullTextSearch?: string
  offset?: number
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface InviteUserPayload {
  userName: string
  userEmail: string
  tmpUserEmail: string  // API validates this field for invite
  name?: string
  lastName?: string
  phoneNumber?: string
  customRoleId?: string
  rolesList?: string   // comma-separated string e.g. "ADMIN,USER"
  tags?: string        // comma-separated string e.g. "prod,backend"
}

export interface InviteUserWithLinkPayload {
  userName: string
  userEmail: string
  tmpUserEmail: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string
}

export interface UpdateUserPayload {
  name?: string
  lastName?: string
  phoneNumber?: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

// ─── Custom Role ─────────────────────────────────────────────────────────────

export interface PermissionItem {
  controllerName: string
  apiName: string
  isAllowed: boolean
}

export interface ControllerPermissions {
  controllerName: string
  apiPermissions: PermissionItem[]
}

export interface CustomRoleItem {
  roleId: string
  orgId?: string
  roleName: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  roleCreatedDate?: string
  permissions?: ControllerPermissions[]
}

export interface GetCustomRolesPayload {
  search?: string
  page?: number
  limit?: number
}

export interface AddCustomRolePayload {
  roleName: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  permissions?: ControllerPermissions[]
}

export interface UpdateCustomRolePayload {
  roleName?: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  permissions?: ControllerPermissions[]
}

// ─── API Key ─────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  keyId: string
  apiKey?: string | null          // key value (only on creation)
  orgId?: string
  keyName?: string | null
  keyCreatedDate?: string | null
  keyExpiredDate?: string | null
  keyDescription?: string | null
  keyStatus?: string | null       // null = active in some cases
  rolesList?: string | null       // comma-separated string
  roles?: unknown[]
  customRoleId?: string | null
  customRoleName?: string | null
  customRoleDesc?: string | null
}

export interface GetApiKeysPayload {
  search?: string
  page?: number
  limit?: number
}

export interface AddApiKeyPayload {
  keyName: string
  keyDescription?: string
  customRoleId?: string
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

export interface UpdateApiKeyPayload {
  keyName?: string
  keyDescription?: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

// ─── Merchant ────────────────────────────────────────────────────────────────

export interface MerchantItem {
  id: string
  orgId?: string | null
  code?: string | null
  name?: string | null
  description?: string | null
  contactEmail?: string | null
  tags?: string | null
  contactPhone?: string | null
  payinFeePct?: number | null
  payoutFeePct?: number | null
  payinMinAmount?: number | null
  payinMaxAmount?: number | null
  payoutMinAmount?: number | null
  payoutMaxAmount?: number | null
  status?: string | null
  createdDate?: string | null
  payInBankAccountCount?: number | null
  payOutBankAccountCount?: number | null
  currentBalance?: number | null
  currentBalanceDecimal?: number | null
}

export interface GetMerchantsPayload {
  FullTextSearch?: string
  page?: number
  limit?: number
  Status?: string
}

export interface AddMerchantPayload {
  OrgCustomId?: string
  OrgName?: string
  OrgDescription?: string
  OrgType?: string
  Tags?: string
  Status?: string
  Merchant?: {
    Code?: string
    Name?: string
    ContactEmail?: string
    ContactPhone?: string
    PayinFeePct?: number | string
    PayoutFeePct?: number | string
    PayinMinAmount?: number | string
    PayinMaxAmount?: number | string
    PayoutMinAmount?: number | string
    PayoutMaxAmount?: number | string
  }
}

export interface UpdateMerchantPayload {
  Code?: string
  Name?: string
  ContactEmail?: string
  ContactPhone?: string
  PayinFeePct?: number | string
  PayoutFeePct?: number | string
  PayinMinAmount?: number | string
  PayinMaxAmount?: number | string
  PayoutMinAmount?: number | string
  PayoutMaxAmount?: number | string
}

// ─── Merchant Org Users & API Keys ───────────────────────────────────────────

export interface OrgUserItem {
  orgUserId: string
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  tmpUserEmail?: string | null
  userStatus?: string | null
  tags?: string | null
  rolesList?: string | null
  roles?: unknown[]
  isOrgInitialUser?: string | null
  createdDate?: string | null
  invitedDate?: string | null
  invitedBy?: string | null
}

export interface OrgApiKeyItem {
  keyId: string
  apiKey?: string | null
  keyName?: string | null
  keyDescription?: string | null
  keyStatus?: string | null
  keyCreatedDate?: string | null
  rolesList?: string | null
  roles?: unknown[]
}

export interface InviteOrgUserPayload {
  UserName: string
  UserEmail: string
}

// ─── Bank Account ────────────────────────────────────────────────────────────

export interface BankItem {
  bankCode: string
  bankName?: string | null
  bankShortName?: string | null
  bankNameEng?: string | null
  bankNameTh?: string | null
  qrSupportFlag?: boolean | null
  type?: string | null
}

export interface BankAccountItem {
  accountId: string
  bankAccountId?: string | null
  orgId?: string | null
  bankCode?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  promptPayId?: string | null
  tags?: string | null
  accountType?: string | null       // "PromptPay" | "Native"
  accountCategory?: string | null   // "PayIn" | "PayOut"
  accountLevel?: string | null      // "Global" | "Selected"
  payinMinAmount?: number | null
  payinMaxAmount?: number | null
  payoutMinAmount?: number | null
  payoutMaxAmount?: number | null
  dailyQuota?: number | null
  status?: string | null
  createdDate?: string | null
  merchantLinkCount?: number | null
  currentBalance?: number | null
  currentBalanceDecimal?: number | null
  currentWalletBalance?: number | null
  currentWalletBalanceDecimal?: number | null
}

export interface GetBankAccountsPayload {
  FullTextSearch?: string
  AccountCategory?: string
  AccountType?: string
  AccountLevel?: string
  page?: number
  limit?: number
}

export interface AddBankAccountPayload {
  BankCode?: string
  AccountNumber?: string
  AccountName?: string
  PromptPayId?: string
  Tags?: string
  AccountType?: string
  AccountCategory?: string
  AccountLevel?: string
  PayinMinAmount?: number
  PayinMaxAmount?: number
  PayoutMinAmount?: number
  PayoutMaxAmount?: number
  DailyQuota?: number
}

export interface UpdateBankAccountPayload {
  BankCode?: string
  AccountNumber?: string
  AccountName?: string
  PromptPayId?: string
  Tags?: string
  AccountType?: string
  AccountLevel?: string
  PayinMinAmount?: number
  PayinMaxAmount?: number
  PayoutMinAmount?: number
  PayoutMaxAmount?: number
  DailyQuota?: number
}

export interface BankAccountMerchantItem {
  merchantId: string
  merchantName?: string | null
  merchantCode?: string | null
  isSelected?: boolean | null
}

// ─── QR Payment ──────────────────────────────────────────────────────────────

export interface SubmitPaymentRequestPayload {
  RefId: string
  RefId1?: string
  RefId2?: string
  Description?: string
  Currency?: string
  RequestedAmount: number
  QrProvider?: string
  SelectedPayInBankAccountId?: string
}

export interface PaymentRequestResponse {
  id?: string
  referenceId?: string
  requestedAmount?: number
  generatedAmount?: number
  currency?: string
  qrCode?: string
  qrCodeImage?: string
  payInBankAccountNo?: string
  payInBankAccountName?: string
  payInBankCode?: string
}

// ─── Pay-In Requests ─────────────────────────────────────────────────────────

export interface PayInRequestItem {
  id: string
  createdDate?: string | null
  merchantCode?: string | null
  merchantName?: string | null
  generatedAmount?: number | null
  requestedAmount?: number | null
  currency?: string | null
  status?: string | null
  refId?: string | null
  refId1?: string | null
  refId2?: string | null
  paymentTxId?: string | null
  // bank account fields (API uses lowercase 'payin')
  payinBankCode?: string | null
  payinBankAccountNo?: string | null
  payinBankAccountName?: string | null
  payinPromptPayId?: string | null
  payinAccountType?: string | null
  payinAccountLevel?: string | null
}

export interface PayInRequestDetail extends PayInRequestItem {
  orgId?: string | null
  description?: string | null
  qrProvider?: string | null
  responseDataObj?: string | null
  processingSteps?: string[] | null
  processingMessages?: string | null
  merchantId?: string | null
  paymentTxId?: string | null
  direction?: string | null
}

export interface GetPayInRequestsPayload {
  fullTextSearch?: string
  direction?: string
  status?: string
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
}

// ─── Pay-In Transactions ─────────────────────────────────────────────────────

export interface PaymentTxJobParameter {
  name?: string | null
  value?: string | null
}

export interface PaymentTxJob {
  id?: string | null
  orgId?: string | null
  status?: string | null
  jobMessage?: string | null
  name?: string | null
  tags?: string | null
  description?: string | null
  type?: string | null
  progressPct?: number | null
  succeedCount?: number | null
  failedCount?: number | null
  createdDate?: string | null
  startDate?: string | null
  endDate?: string | null
  parameters?: PaymentTxJobParameter[] | null
}

export interface PayInTxItem {
  id: string
  orgId?: string | null
  merchantId?: string | null
  merchantCode?: string | null
  merchantName?: string | null
  paymentRequestId?: string | null
  description?: string | null
  currency?: string | null
  tags?: string | null
  status?: string | null
  direction?: string | null
  txAmount?: number | null
  txAmountDecimal?: number | null
  payInFeePct?: number | null
  payInFee?: number | null
  payInFeeDecimal?: number | null
  payInTotalAmount?: number | null
  payInTotalAmountDecimal?: number | null
  payInBankAccountId?: string | null
  payInBankCode?: string | null
  payInBankAccountNo?: string | null
  payInBankAccountName?: string | null
  fromBankCode?: string | null
  fromBankAccountNo?: string | null
  fromBankAccountName?: string | null
  processingMessages?: string | null
  createdDate?: string | null
  processingSteps?: string[] | null
  rawInputObj?: unknown | null
  jobId?: string | null
}

export interface PayInTxDetail extends PayInTxItem {
  rawInput?: string | null
  rawInputObj?: unknown | null
}

export interface GetPayInTxPayload {
  fullTextSearch?: string
  status?: string
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface WalletItem {
  id?: string | null
  orgId?: string | null
  merchantId?: string | null
  pointBalance?: number | null
  pointBalanceDecimal?: number | null
  status?: string | null
  createdDate?: string | null
  name?: string | null
  tags?: string | null
  description?: string | null
}

export interface PointTxItem {
  id?: string | null
  walletId?: string | null
  orgId?: string | null
  merchantId?: string | null
  createdDate?: string | null
  tags?: string | null
  description?: string | null
  txAmount?: number | null
  txAmountDecimal?: number | null
  txType?: number | null
  previousBalance?: number | null
  previousBalanceDecimal?: number | null
  currentBalance?: number | null
  currentBalanceDecimal?: number | null
}

export interface AddPointPayload {
  Tags?: string
  Description?: string
  TxAmount?: number
  TxAmountDecimal?: number
}

export interface GetPointTxsPayload {
  Offset?: number
  Limit?: number
}

export interface SubmitLinePaymentTxPayload {
  PaymentAmount: number
  RemainAmount?: number
  TxType?: string
  SourceBankCode?: string
  SourceBankAccountNo?: string
  DestinationBankCode?: string
  DestinationAccountNo?: string
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface CountResponse {
  count: number
}

export interface MerchantSummaryItem {
  merchantCode?: string | null
  merchantStatus?: string | null
  merchantCount?: number | null
  txAmount?: number | null
  feeAmount?: number | null
  balanceAmount?: number | null
}

export interface MerchantSummaryResponse {
  merchantCount?: number | null
  merchantCountByStatus?: MerchantSummaryItem[] | null
  merchantsBalances?: MerchantSummaryItem[] | null
  merchantsPayInSummary?: MerchantSummaryItem[] | null
  merchantsPayOutSummary?: MerchantSummaryItem[] | null
}

export interface DailyRevenueItem {
  date?: string | null
  payInFee?: number | null
  payOutFee?: number | null
}

export interface DailyMerchantRevenueItem {
  date?: string | null
  merchantCode?: string | null
  payInAmount?: number | null
  payOutAmount?: number | null
  payInFee?: number | null
  payOutFee?: number | null
}

export interface RevenueSummaryResponse {
  totalPayInAmount?: number | null
  totalPayOutAmount?: number | null
  totalPayInFee?: number | null
  totalPayOutFee?: number | null
  totalPayInCount?: number | null
  totalPayOutCount?: number | null
  payInByMerchant?: MerchantSummaryItem[] | null
  payOutByMerchant?: MerchantSummaryItem[] | null
  dailyRevenue?: DailyRevenueItem[] | null
  dailyMerchantRevenue?: DailyMerchantRevenueItem[] | null
}

// ─── Pay-In Slip (Payment Document) ─────────────────────────────────────────

export interface PayInSlipItem {
  id: string                           // primary key from API
  orgId?: string | null
  merchantId?: string | null
  merchantCode?: string | null
  merchantName?: string | null
  paymentRequestId?: string | null
  description?: string | null
  currency?: string | null
  tags?: string | null
  status?: string | null              // Pending | Approved | Rejected
  direction?: string | null
  txAmount?: number | null
  txAmountDecimal?: number | null
  txAmountStr?: string | null
  fileDocumentId?: string | null
  uploadedFilePath?: string | null
  refId?: string | null
  payInBankAccountId?: string | null
  payInBankCode?: string | null
  payInBankAccountNo?: string | null
  payInBankAccountName?: string | null
  payInAccountType?: string | null      // "PromptPay" | "Native"
  payInPromptPayId?: string | null
  payOutBankAccountId?: string | null
  payOutBankCode?: string | null
  payOutBankAccountNo?: string | null
  payOutBankAccountName?: string | null
  fromBankCode?: string | null
  fromBankAccountNo?: string | null
  fromBankAccountName?: string | null
  rejectReason?: string | null
  paymentTransactionId?: string | null
  processingMessages?: string | null
  processingSteps?: string[] | null
  mimeType?: string | null
  documentType?: string | null
  previewUrl?: string | null
  createdDate?: string | null
}

export interface PayInSlipDetail extends PayInSlipItem {}

export interface GetPayInDocumentsPayload {
  fullTextSearch?: string
  status?: string
  offset?: number
  limit?: number
}

export interface GetPresignedUrlPayload {
  MimeType: string
}

export interface AddPayInDocumentPayload {
  UploadedFilePath: string
  MimeType: string
  TxAmountDecimal: number
  PayInBankAccountId: string
  MerchantId: string
  RefId: string
}

export interface UpdatePayInDocumentPayload {
  TxAmountDecimal?: number
  PayInBankAccountId?: string
  RefId?: string
}

export interface ApprovePayInDocumentPayload {
  TxAmountDecimal: number
  TxAmount?: number
  Currency?: string
  RefId: string
  PayInBankAccountId: string
  MerchantId: string
}

export interface RejectPayInDocumentPayload {
  TxAmountDecimal: number
  TxAmount?: number
  Currency?: string
  RefId: string
  PayInBankAccountId: string
  MerchantId: string
  RejectReason: string
}

// ─── Pay-Out Requests ────────────────────────────────────────────────────────

export interface PayOutRequestItem {
  id: string
  createdDate?: string | null
  orgId?: string | null
  merchantId?: string | null
  merchantId2?: string | null
  merchantCode?: string | null
  merchantName?: string | null
  description?: string | null
  currency?: string | null
  status?: string | null            // "Pending" | "Paid" | "Rejected"
  direction?: string | null
  generatedAmount?: number | null
  requestedAmount?: number | null
  tags?: string | null
  refId?: string | null
  refId1?: string | null
  refId2?: string | null
  rejectReason?: string | null
  paymentTxId?: string | null
  // Source (PayIn) bank account — API uses camelCase "payin" (lowercase)
  payinBankAccountId?: string | null
  payinBankCode?: string | null
  payinBankAccountNo?: string | null
  payinBankAccountName?: string | null
  payinAccountType?: string | null
  payinAccountLevel?: string | null
  payinPromptPayId?: string | null
  payInFeePct?: number | null
  selectedPayInBankAccountId?: string | null
  // Destination (PayOut) bank account — API uses camelCase "payout" (lowercase)
  payoutBankAccountId?: string | null
  payoutBankCode?: string | null
  payoutBankAccountNo?: string | null
  payoutBankAccountName?: string | null
  payoutPromptPayId?: string | null
  payoutAccountType?: string | null
  payoutAccountLevel?: string | null
  payoutFeePct?: number | null
  payoutFeeDecimal?: number | null
  payOutTotalAmountDecimal?: number | null
}

export interface PayOutRequestDetail extends PayOutRequestItem {
  processingMessages?: string | null
  processingSteps?: string[] | null
  responseData?: string | null
  responseDataObj?: unknown | null
  merchantMinPayout?: number | null
  merchantMaxPayout?: number | null
  qrCode?: string | null
  qrCodeImage?: string | null
}

export interface GetPayOutRequestsPayload {
  fullTextSearch?: string
  status?: string
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
}

export interface CreatePayOutRequestPayload {
  MerchantId: string
  RefId: string
  RefId1?: string
  RefId2?: string
  Description?: string
  Currency?: string
  RequestedAmount: number
  QrProvider?: string
  Tags?: string
  PayinBankAccountId: string
}

export interface UpdatePayOutRequestPayload {
  MerchantId?: string
  PayinBankAccountId?: string
  Description?: string
  RefId?: string
}

export interface ApprovePayOutRequestPayload {
  PayoutBankAccountId?: string
}

export interface RejectPayOutRequestPayload {
  RejectReason: string
}
