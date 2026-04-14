<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑用户' : '新增用户'"
    :width="560"
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
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="用户名" name="username">
            <a-input
              v-model:value="formData.username"
              placeholder="请输入用户名"
              :disabled="isEdit"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="昵称" name="nickname">
            <a-input v-model:value="formData.nickname" placeholder="请输入昵称" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="!isEdit">
        <a-col :span="24">
          <a-form-item label="密码" name="password">
            <a-input-password
              v-model:value="formData.password"
              placeholder="请输入密码（至少 8 位，包含大小写字母和数字）"
              autocomplete="new-password"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="手机号" name="phone">
            <a-input v-model:value="formData.phone" placeholder="请输入手机号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="邮箱" name="email">
            <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="状态" name="status">
            <a-select v-model:value="formData.status" style="width: 100%">
              <a-select-option :value="1">正常</a-select-option>
              <a-select-option :value="0">禁用</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts" name="AppUserEditDialog">
import { message } from 'ant-design-vue'
import { getAppUser, addAppUser, updateAppUser } from '@/api/app-user'

const props = defineProps<{
  userId?: string
}>()

const emit = defineEmits(['close', 'success'])

const visible = ref(true)
const submitLoading = ref(false)
const formRef = ref()

const isEdit = computed(() => !!props.userId)

const formData = reactive({
  username: '',
  nickname: '',
  password: '',
  phone: '',
  email: '',
  status: 1 as number,
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

// 编辑时加载数据
const loadData = async () => {
  if (!props.userId) return
  const resp = await getAppUser(props.userId)
  if (resp.success) {
    const data = resp.result
    formData.username = data.username || ''
    formData.nickname = data.nickname || ''
    formData.phone = data.phone || ''
    formData.email = data.email || ''
    formData.status = data.status ?? 1
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
    const payload: any = { ...formData }
    if (isEdit.value) {
      delete payload.password // 编辑时不传密码
    }

    let resp: any
    if (isEdit.value) {
      resp = await updateAppUser(props.userId!, payload)
    } else {
      resp = await addAppUser(payload)
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
