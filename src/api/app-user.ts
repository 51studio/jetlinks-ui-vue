import { request } from '@jetlinks-web/core'

// -----------------------------------------------------------------------
// 后台管理 - 第三方用户（管理员视角）
// 基础 CRUD 操作均通过通用 CRUD 接口完成
// -----------------------------------------------------------------------

/**
 * 分页查询 第三方用户列表
 */
export const queryAppUserList = (data: any) =>
  request.post<any>('/app/user/admin/_query', data)

/**
 * 获取 第三方用户详情
 */
export const getAppUser = (id: string) =>
  request.get<any>(`/app/user/admin/${id}`)

/**
 * 新增 第三方用户
 */
export const addAppUser = (data: any) =>
  request.post<any>('/app/user/admin', data)

/**
 * 修改 第三方用户信息
 */
export const updateAppUser = (id: string, data: any) =>
  request.put<any>(`/app/user/admin/${id}`, data)

/**
 * 删除 第三方用户
 */
export const deleteAppUser = (id: string) =>
  request.remove<any>(`/app/user/admin/${id}`)

/**
 * 启用 第三方用户
 */
export const enableAppUser = (id: string) =>
  request.post<any>(`/app/user/admin/${id}/_enable`)

/**
 * 禁用 第三方用户
 */
export const disableAppUser = (id: string) =>
  request.post<any>(`/app/user/admin/${id}/_disable`)

/**
 * 重置 第三方用户密码（管理员）
 */
export const resetAppUserPassword = (id: string, newPassword: string) =>
  request.post<any>(`/app/user/admin/${id}/password/_reset`, { newPassword })

// -----------------------------------------------------------------------
// 后台管理 - 第三方用户设备绑定（管理员视角）
// -----------------------------------------------------------------------

/**
 * 查询指定用户的设备关联列表
 * @param userId 用户ID
 * @param relationType 关联类型过滤（manage/bind/share，不传则查全部）
 */
export const queryAppUserDevices = (userId: string, relationType?: string) => {
  const terms: any[] = []
  if (relationType) {
    terms.push({ column: 'relationType', termType: 'eq', value: relationType })
  }
  return request.post<any>(`/app/user/admin/${userId}/devices/_query/no-paging`, {
    paging: false,
    terms,
    sorts: [{ name: 'bindTime', order: 'desc' }],
  })
}

/**
 * 管理员解绑指定用户的设备
 */
export const unbindAppUserDevice = (userId: string, deviceId: string) =>
  request.remove<any>(`/app/user/admin/${userId}/devices/${deviceId}`)
