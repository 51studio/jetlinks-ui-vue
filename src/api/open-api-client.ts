import { request } from '@jetlinks-web/core'

// -----------------------------------------------------------------------
// 应用管理接口
// 对应后端 /application 路由
// -----------------------------------------------------------------------

export const queryApiClientList = (data: any) =>
  request.post<any>('/application/_query', data)

export const getApiClient = (id: string) =>
  request.get<any>(`/application/${id}`)

export const addApiClient = (data: any) =>
  request.post<any>('/application', data)

export const updateApiClient = (id: string, data: any) =>
  request.put<any>(`/application/${id}`, data)

export const deleteApiClient = (id: string) =>
  request.remove<any>(`/application/${id}`)

export const enableApiClient = (id: string) =>
  request.post<any>(`/application/${id}/_enable`)

export const disableApiClient = (id: string) =>
  request.post<any>(`/application/${id}/_disable`)

export const generateApiClientKeys = (id: string) =>
  request.post<any>(`/application/${id}/_generate-keys`)

export const issueApiClientToken = (id: string) =>
  request.post<any>(`/application/${id}/_issue-token`)

export const queryApiClientAccessLog = (id: string, data: any) =>
  request.post<any>(`/application/${id}/access-log/_query`, data)

export const bindApiClientRole = (clientId: string, data: string[]) =>
  request.post<any>(`/application/${clientId}/role/_bind`, data)

export const unbindApiClientRole = (clientId: string, data: string[]) =>
  request.post<any>(`/application/${clientId}/role/_unbind`, data)

export const getApiClientRoles = (clientId: string, data?: any) =>
  request.post<any>(`/application/${clientId}/role/_query`, data)

export const bindApiClientOrg = (clientId: string, data: object) =>
  request.post<any>(`/application/${clientId}/org/_bind`, data)

export const unbindApiClientOrg = (clientId: string, data: object) =>
  request.post<any>(`/application/${clientId}/org/_unbind`, data)

export const getApiClientOrgs = (clientId: string, data?: any) =>
  request.post<any>(`/application/${clientId}/org/_query`, data)
