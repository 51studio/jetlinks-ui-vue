<template>
  <a-drawer
    v-model:open="visible"
    title="应用配置"
    placement="right"
    :width="700"
    :destroy-on-close="true"
    @close="visible = false"
  >
    <div class="config-container">
      <!-- 应用头部 -->
      <div class="app-header">
        <div class="app-avatar">
          <AIcon type="AppstoreOutlined" />
        </div>
        <div class="app-info">
          <div class="app-name">
            {{ clientData.name }}
            <a-tag class="app-tag">第三方应用</a-tag>
          </div>
          <div class="app-desc">{{ clientData.description || '暂无描述' }}</div>
        </div>
      </div>

      <!-- 配置表单 -->
      <div class="config-section">
        <div class="section-title">
          <span class="title-bar"></span>
          <span class="title-text">API服务</span>
        </div>

        <a-form :model="formData" layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="appID">
                <a-input v-model:value="formData.appId" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="secureKey">
                <a-input v-model:value="formData.secretKey" disabled />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="角色">
                <a-select
                  v-model:value="selectedRoles"
                  mode="multiple"
                  placeholder="请选择角色"
                  style="width: 100%"
                  :options="roleOptions"
                  option-label-prop="label"
                  allow-clear
                >
                  <template #suffixIcon>
                    <AIcon type="PlusOutlined" />
                  </template>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="组织">
                <a-select
                  v-model:value="selectedOrgs"
                  mode="multiple"
                  placeholder="请选择组织"
                  style="width: 100%"
                  :options="orgOptions"
                  option-label-prop="label"
                  allow-clear
                >
                  <template #suffixIcon>
                    <AIcon type="PlusOutlined" />
                  </template>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="限流（次/秒）">
                <a-input-number
                  v-model:value="formData.rateLimit"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                  placeholder="0 表示不限"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="状态">
                <a-select v-model:value="formData.state" style="width: 100%">
                  <a-select-option value="enabled">已启用</a-select-option>
                  <a-select-option value="disabled">已禁用</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="IP白名单">
            <a-textarea
              v-model:value="ipWhiteListText"
              placeholder="请输入IP地址，多个IP用逗号分隔，留空表示不限制"
              :rows="3"
            />
          </a-form-item>
        </a-form>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <a-space>
        <a-button @click="visible = false">重置</a-button>
        <a-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import {
  getApiClient,
  updateApiClient,
  bindApiClientRole,
  unbindApiClientRole,
  bindApiClientOrg,
  unbindApiClientOrg,
  getApiClientRoles,
  getApiClientOrgs,
} from '@/api/open-api-client'
import { getRoleListNoPaging_api } from '@authentication-manager-ui/api/system/role'
import { getTreeData_api } from '@authentication-manager-ui/api/system/department'

const props = defineProps<{
  clientId: string
}>()

const emit = defineEmits(['success', 'close'])

const visible = ref(false)
const submitLoading = ref(false)
const clientData = ref<any>({})
const formData = reactive({
  appId: '',
  secretKey: '',
  rateLimit: 0,
  state: 'enabled',
})

const selectedRoles = ref<string[]>([])
const roleOptions = ref<any[]>([])
const selectedOrgs = ref<string[]>([])
const orgOptions = ref<any[]>([])
const ipWhiteListText = ref('')

// 组件挂载后延迟显示，确保数据加载完成
onMounted(() => {
  nextTick(() => {
    visible.value = true
  })
  loadClientData()
  loadRoles()
  loadOrgs()
})

// 监听 clientId 变化，重新加载数据
watch(() => props.clientId, () => {
  if (props.clientId) {
    loadClientData()
    loadRoles()
    loadOrgs()
  }
}, { immediate: false })

const loadClientData = async () => {
  const resp = await getApiClient(props.clientId)
  if (resp.success) {
    clientData.value = resp.result || {}
    formData.appId = clientData.value.appId || ''
    formData.secretKey = clientData.value.secretKey || ''
    formData.rateLimit = clientData.value.rateLimit || 0
    // 处理 state 可能是对象或字符串的情况
    const stateValue = clientData.value.state
    formData.state = typeof stateValue === 'object' ? stateValue.value : (stateValue || 'enabled')
    ipWhiteListText.value = clientData.value.ipWhiteList || ''
  }
  
  // 加载已绑定的角色
  await loadBoundRoles()
  // 加载已绑定的组织
  await loadBoundOrgs()
}

const loadBoundRoles = async () => {
  try {
    const resp = await getApiClientRoles(props.clientId, {
      pageIndex: 0,
      pageSize: 1000,
    })
    if (resp.success) {
      // 后端返回的是 DimensionUserEntity，包含 dimensionId (角色ID)
      selectedRoles.value = (resp.result?.data || []).map((r: any) => r.dimensionId || r.id)
    }
  } catch (error) {
    console.error('加载已绑定角色失败:', error)
    // 如果接口未实现或报错，不影响其他功能
    selectedRoles.value = []
  }
}

const loadBoundOrgs = async () => {
  try {
    const resp = await getApiClientOrgs(props.clientId, {
      pageIndex: 0,
      pageSize: 1000,
    })
    if (resp.success) {
      // 后端返回的是 DimensionUserEntity，包含 dimensionId (组织ID)
      selectedOrgs.value = (resp.result?.data || []).map((o: any) => o.dimensionId || o.id)
    }
  } catch (error) {
    console.error('加载已绑定组织失败:', error)
    // 如果接口未实现或报错，不影响其他功能
    selectedOrgs.value = []
  }
}

const loadRoles = async () => {
  const resp = await getRoleListNoPaging_api()
  if (resp.success) {
    roleOptions.value = (resp.result || []).map((r: any) => ({
      value: r.id,
      label: r.name,
    }))
  }
}

const loadOrgs = async () => {
  const resp = await getTreeData_api({})
  if (resp.success) {
    orgOptions.value = flattenOrgTree(resp.result || [])
  }
}

const flattenOrgTree = (list: any[]): any[] => {
  const result: any[] = []
  list.forEach((item) => {
    result.push({ value: item.id, label: item.name })
    if (item.children && item.children.length > 0) {
      result.push(...flattenOrgTree(item.children))
    }
  })
  return result
}

const handleSubmit = async () => {
  submitLoading.value = true
  try {
    const updatePayload = {
      name: clientData.value.name,
      description: clientData.value.description,
      state: formData.state,
      rateLimit: formData.rateLimit,
      ipWhiteList: ipWhiteListText.value || null,
    }
    await updateApiClient(props.clientId, updatePayload)

    await bindApiClientRole(props.clientId, selectedRoles.value)
    
    const orgIdsToUnbind = orgOptions.value
      .map((o) => o.value)
      .filter((id) => !selectedOrgs.value.includes(id))
    if (orgIdsToUnbind.length > 0) {
      await unbindApiClientOrg(props.clientId, { orgIds: orgIdsToUnbind })
    }
    if (selectedOrgs.value.length > 0) {
      await bindApiClientOrg(props.clientId, { orgIds: selectedOrgs.value })
    }

    message.success('保存成功')
    emit('success')
    // 延迟关闭，确保事件传递完成
    setTimeout(() => {
      visible.value = false
    }, 100)
  } finally {
    submitLoading.value = false
  }
}
</script>

<style lang="less" scoped>
.config-container {
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 24px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 24px;

  .app-avatar {
    width: 48px;
    height: 48px;
    background: #1890ff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24px;
  }

  .app-info {
    flex: 1;

    .app-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;

      .app-tag {
        font-size: 12px;
        padding: 0 6px;
        height: 20px;
        line-height: 18px;
      }
    }

    .app-desc {
      color: #8c8c8c;
      font-size: 14px;
    }
  }
}

.config-section {
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .title-bar {
      width: 3px;
      height: 16px;
      background: #1890ff;
      border-radius: 2px;
    }

    .title-text {
      font-size: 14px;
      font-weight: 500;
    }
  }
}
</style>