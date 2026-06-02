import { client } from '@/lib/axios'
import type {
  UserItem,
  GetUsersPayload,
  UpdateUserPayload,
  AddCustomRolePayload,
  UpdateCustomRolePayload,
  AddApiKeyPayload,
  UpdateApiKeyPayload,
} from './types'

function getOrgId() {
  if (typeof window === 'undefined') return 'temp'
  return localStorage.getItem('orgId') || 'temp'
}

export const userApi = {
  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (payload: GetUsersPayload = {}) => {
    const orgId = getOrgId()
    return client.post<{ users: UserItem[] }>(`/api/OrganizationUser/org/${orgId}/action/GetUsers`, payload)
  },

  getUserCount: (payload: GetUsersPayload = {}) => {
    const orgId = getOrgId()
    return client.post<{ count: number }>(`/api/OrganizationUser/org/${orgId}/action/GetUserCount`, payload)
  },

  getUserById: (userId: string) => {
    const orgId = getOrgId()
    return client.get<{ user: UserItem }>(`/api/OrganizationUser/org/${orgId}/action/GetUserById/${userId}`)
  },

  getUserByUserName: (userName: string) => {
    const orgId = getOrgId()
    return client.get(`/api/OnlyUser/org/${orgId}/action/GetUserByUserName/${userName}`)
  },

  updateUserByUserName: (userName: string, payload: UpdateUserPayload) => {
    const orgId = getOrgId()
    return client.post(`/api/OnlyUser/org/${orgId}/action/UpdateUserByUserName/${userName}`, payload)
  },

  updateUserById: (userId: string, payload: UpdateUserPayload) => {
    const orgId = getOrgId()
    return client.post(`/api/OrganizationUser/org/${orgId}/action/UpdateUserById/${userId}`, payload)
  },

  updatePassword: (payload: { userName: string; currentPassword: string; newPassword: string }) => {
    const orgId = getOrgId()
    return client.post(`/api/OnlyUser/org/${orgId}/action/UpdatePassword`, payload)
  },

  enableUserById: (userId: string) => {
    const orgId = getOrgId()
    return client.post(`/api/OrganizationUser/org/${orgId}/action/EnableUserById/${userId}`, {})
  },

  disableUserById: (userId: string) => {
    const orgId = getOrgId()
    return client.post(`/api/OrganizationUser/org/${orgId}/action/DisableUserById/${userId}`, {})
  },

  deleteUserById: (userId: string) => {
    const orgId = getOrgId()
    return client.delete(`/api/OrganizationUser/org/${orgId}/action/DeleteUserById/${userId}`)
  },

  inviteUserWithLink: (payload: { TmpUserEmail: string; UserName?: string; Roles?: string[]; CustomRoleId?: string; tags?: string }) => {
    const orgId = getOrgId()
    return client.post(`/api/OrganizationUser/org/${orgId}/action/InviteUserWithLink`, payload)
  },

  getForgotPasswordLink: (userId: string) => {
    const orgId = getOrgId()
    return client.get<{ forgotPasswordUrl?: string; resetLink?: string }>(
      `/api/OrganizationUser/org/${orgId}/action/GetForgotPasswordLink/${userId}`
    )
  },

  // ── Roles ──────────────────────────────────────────────────────────────────
  getRoles: () => {
    const orgId = getOrgId()
    return client.post<{ roles: { id: string; name: string; description?: string }[] }>(
      `/api/Role/org/${orgId}/action/GetRoles`,
      { offset: 0, limit: 100 }
    )
  },

  getCustomRoles: (payload: { offset?: number; limit?: number; fullTextSearch?: string } = {}) => {
    const orgId = getOrgId()
    return client.post(`/api/CustomRole/org/${orgId}/action/GetCustomRoles`, {
      offset: 0, limit: 100, ...payload,
    })
  },

  getCustomRoleCount: () => {
    const orgId = getOrgId()
    return client.post<{ count: number }>(`/api/CustomRole/org/${orgId}/action/GetCustomRoleCount`, {})
  },

  getCustomRoleById: (customRoleId: string) => {
    const orgId = getOrgId()
    return client.get(`/api/CustomRole/org/${orgId}/action/GetCustomRoleById/${customRoleId}`)
  },

  addCustomRole: (payload: AddCustomRolePayload) => {
    const orgId = getOrgId()
    return client.post(`/api/CustomRole/org/${orgId}/action/AddCustomRole`, payload)
  },

  updateCustomRoleById: (customRoleId: string, payload: UpdateCustomRolePayload) => {
    const orgId = getOrgId()
    return client.post(`/api/CustomRole/org/${orgId}/action/UpdateCustomRoleById/${customRoleId}`, payload)
  },

  deleteCustomRoleById: (customRoleId: string) => {
    const orgId = getOrgId()
    return client.delete(`/api/CustomRole/org/${orgId}/action/DeleteCustomRoleById/${customRoleId}`)
  },

  getInitialUserRolePermissions: () => {
    const orgId = getOrgId()
    return client.get(`/api/CustomRole/org/${orgId}/action/GetInitialUserRolePermissions`)
  },

  // ── API Keys ───────────────────────────────────────────────────────────────
  addApiKey: (payload: AddApiKeyPayload) => {
    const orgId = getOrgId()
    return client.post(`/api/ApiKey/org/${orgId}/action/AddApiKey`, payload)
  },

  getApiKeyById: (keyId: string) => {
    const orgId = getOrgId()
    return client.get(`/api/ApiKey/org/${orgId}/action/GetApiKeyById/${keyId}`)
  },

  updateApiKeyById: (keyId: string, payload: UpdateApiKeyPayload) => {
    const orgId = getOrgId()
    return client.post(`/api/ApiKey/org/${orgId}/action/UpdateApiKeyById/${keyId}`, payload)
  },

  // ── Registration (signup confirm) ──────────────────────────────────────────
  confirmInvite: (orgId: string, token: string, payload: {
    username: string; email: string; password: string; firstName: string; lastName: string; orgUserId?: string
  }) =>
    client.post(
      `/api/Registration/org/${orgId}/action/ConfirmNewUserInvitation/${token}/${payload.username}`,
      {
        Email: payload.email,
        UserName: payload.username,
        Password: payload.password,
        Name: payload.firstName,
        LastName: payload.lastName,
        OrgUserId: payload.orgUserId,
      }
    ),

  confirmExistingUserInvite: (orgId: string, token: string, payload: {
    username: string; email: string; orgUserId?: string
  }) =>
    client.post(
      `/api/Registration/org/${orgId}/action/ConfirmExistingUserInvitation/${token}/${payload.username}`,
      { Email: payload.email, UserName: payload.username, OrgUserId: payload.orgUserId }
    ),

  confirmForgotPassword: (orgId: string, token: string, payload: {
    username: string; email: string; password: string; orgUserId?: string
  }) =>
    client.post(
      `/api/Registration/org/${orgId}/action/ConfirmForgotPasswordReset/${token}/${payload.username}`,
      {
        Password: payload.password,
        UserName: payload.username,
        Email: payload.email,
        OrgUserId: payload.orgUserId,
      }
    ),
}
