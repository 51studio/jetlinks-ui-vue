<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑应用' : '新增应用'"
    :width="600"
    :confirm-loading="submitLoading"
    @ok="handleSubmit"
    @cancel="$emit('close')"
    destroy-on-close
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      style="margin-top: 8px"
    >
      <a-form-item label="应用名称" name="name">
        <a-input v-model:value="formData.name" placeholder="请输入应用名称" />
      </a-form-item>

      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入描述（选填）"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="状态" name="state">
            <a-select v-model:value="formData.state" style="width: 100%">
              <a-select-option value="enabled">启用</a-select-option>
              <a-select-option value="disabled">禁用</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="限流（次/秒，0 表示不限）" name="rateLimit">
            <a-input-number
              v-model:value="formData.rateLimit"
              :min="0"
              :precision="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="IP 白名单" name="ipWhiteList">
        <a-select
          v-model:value="formData.ipWhiteList"
          mode="tags"
          placeholder="输入 IP 地址后按 Enter 添加，留空则不限制来源 IP"
          :token-separators="[',', ' ']"
          style="width: 100%"
        />
        <div style="color: #8c8c8c; font-size: 12px; margin-top: 4px">
          支持 CIDR 格式，例如：192.168.1.0/24
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts" name="OpenApiClientEditDialog">
import { message } from 'ant-design-vue'
import { getApiClient, addApiClient, updateApiClient } from '@/api/open-api-client'

const props = defineProps<{
  clientId?: string
}>()

const emit = defineEmits(['close', 'success'])

const visible = ref(true)
const submitLoading = ref(false)
const formRef = ref()

const isEdit = computed(() => !!props.clientId)

const formData = reactive({
  name: '',
  description: '',
  state: 'enabled' as string,
  rateLimit: 0,
  ipWhiteList: [] as string[],
})

const rules: any = {
  name: [{ required: true, message: '请输入客户端名称', trigger: 'blur' }],
  state: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const loadData = async () => {
  if (!props.clientId) return
  const resp = await getApiClient(props.clientId)
  if (resp.success) {
    const data = resp.result
    formData.name = data.name || ''
    formData.description = data.description || ''
    // 处理 state 可能是对象或字符串的情况
    const stateValue = data.state
    formData.state = typeof stateValue === 'object' ? stateValue.value : (stateValue || 'enabled')
    formData.rateLimit = data.rateLimit ?? 0
    formData.ipWhiteList = data.ipWhiteList
      ? data.ipWhiteList.split(',').filter((s: string) => s.trim())
      : []
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      ...formData,
      ipWhiteList: formData.ipWhiteList.length ? formData.ipWhiteList.join(',') : null,
    }
    let resp: any
    if (isEdit.value) {
      resp = await updateApiClient(props.clientId!, payload)
    } else {
      resp = await addApiClient(payload)
    }

    if (resp.success || resp.status === 200) {
      message.success(isEdit.value ? '保存成功' : '新增成功')
      emit('success')
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
