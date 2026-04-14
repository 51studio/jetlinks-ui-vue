<template>
  <div class="app-user-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <a-row :gutter="16" align="middle">
        <a-col :span="6">
          <a-input
            v-model:value="searchParams.username"
            placeholder="请输入用户名"
            allow-clear
            @press-enter="handleSearch"
            @change="(val: any) => !val.target.value && handleSearch()"
          />
        </a-col>
        <a-col :span="6">
          <a-input
            v-model:value="searchParams.phone"
            placeholder="请输入手机号"
            allow-clear
            @press-enter="handleSearch"
            @change="(val: any) => !val.target.value && handleSearch()"
          />
        </a-col>
        <a-col :span="4">
          <a-select
            v-model:value="searchParams.status"
            placeholder="请选择状态"
            allow-clear
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option :value="1">正常</a-select-option>
            <a-select-option :value="0">已禁用</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="8">
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
            <a-button type="primary" @click="handleAdd">
              <template #icon><PlusOutlined /></template>
              新增
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 数据表格 -->
    <a-table
      :columns="columns"
      :data-source="tableData"
      :pagination="pagination"
      :loading="loading"
      row-key="id"
      @change="handleTableChange"
    >
      <!-- 头像列 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'avatar'">
          <a-avatar v-if="record.avatar" :src="record.avatar" />
          <a-avatar v-else>
            {{ record.nickname?.charAt(0) || record.username?.charAt(0) || '?' }}
          </a-avatar>
        </template>

        <!-- 状态列 -->
        <template v-else-if="column.key === 'status'">
          <a-badge
            :status="record.status === 1 ? 'processing' : 'default'"
            :text="record.status === 1 ? '正常' : '已禁用'"
          />
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a @click="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a @click="handleViewDevices(record)">绑定设备</a>
            <a-divider type="vertical" />
            <a
              v-if="record.status === 1"
              style="color: #faad14"
              @click="handleToggleStatus(record)"
            >禁用</a>
            <a v-else style="color: #52c41a" @click="handleToggleStatus(record)">启用</a>
            <a-divider type="vertical" />
            <a @click="handleResetPassword(record)" style="color: #1677ff">重置密码</a>
            <a-divider type="vertical" />
            <a-popconfirm
              title="确认删除该用户？删除后数据不可恢复。"
              ok-text="确认"
              cancel-text="取消"
              @confirm="handleDelete(record)"
            >
              <a style="color: #ff4d4f">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑对话框 -->
    <EditDialog
      v-if="editVisible"
      :user-id="editUserId"
      @close="editVisible = false"
      @success="onEditSuccess"
    />

    <!-- 设备绑定列表抽屉 -->
    <DeviceDrawer
      v-if="deviceDrawerVisible"
      :user="currentUser"
      @close="deviceDrawerVisible = false"
    />

    <!-- 重置密码对话框 -->
    <a-modal
      v-model:open="resetPwdVisible"
      title="重置密码"
      @ok="confirmResetPassword"
      :confirm-loading="resetPwdLoading"
      @cancel="resetPwdVisible = false"
    >
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="新密码" required>
          <a-input-password
            v-model:value="newPassword"
            placeholder="请输入新密码（至少 8 位，包含大小写字母和数字）"
            autocomplete="new-password"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts" name="AppUser">
import { SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  queryAppUserList,
  deleteAppUser,
  enableAppUser,
  disableAppUser,
  resetAppUserPassword,
} from '@/api/app-user'
import EditDialog from './components/EditDialog.vue'
import DeviceDrawer from './components/DeviceDrawer.vue'

// -----------------------------------------------------------------------
// 状态
// -----------------------------------------------------------------------
const loading = ref(false)
const tableData = ref<any[]>([])
const editVisible = ref(false)
const editUserId = ref<string | undefined>(undefined)
const deviceDrawerVisible = ref(false)
const currentUser = ref<any>(null)
const resetPwdVisible = ref(false)
const resetPwdUserId = ref<string>('')
const newPassword = ref('')
const resetPwdLoading = ref(false)

const searchParams = reactive({
  username: '',
  phone: '',
  status: undefined as number | undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// -----------------------------------------------------------------------
// 表格列定义
// -----------------------------------------------------------------------
const columns = [
  { title: '头像', key: 'avatar', width: 64 },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
  { title: '手机号', dataIndex: 'phone', key: 'phone' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '状态', key: 'status', width: 100 },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    customRender: ({ text }: any) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

// -----------------------------------------------------------------------
// 数据加载
// -----------------------------------------------------------------------
const loadData = async () => {
  loading.value = true
  try {
    const terms: any[] = []
    if (searchParams.username) {
      terms.push({ column: 'username', termType: 'like', value: `%${searchParams.username}%` })
    }
    if (searchParams.phone) {
      terms.push({ column: 'phone', termType: 'like', value: `%${searchParams.phone}%` })
    }
    if (searchParams.status) {
      terms.push({ column: 'status', termType: 'eq', value: searchParams.status })
    }

    const resp = await queryAppUserList({
      pageIndex: pagination.current - 1,
      pageSize: pagination.pageSize,
      terms,
      sorts: [{ name: 'createTime', order: 'desc' }],
    })
    if (resp.success) {
      tableData.value = resp.result?.data || []
      pagination.total = resp.result?.total || 0
    }
  } finally {
    loading.value = false
  }
}

// -----------------------------------------------------------------------
// 事件处理
// -----------------------------------------------------------------------
const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const handleReset = () => {
  searchParams.username = ''
  searchParams.phone = ''
  searchParams.status = undefined
  pagination.current = 1
  loadData()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

const handleAdd = () => {
  editUserId.value = undefined
  editVisible.value = true
}

const handleEdit = (record: any) => {
  editUserId.value = record.id
  editVisible.value = true
}

const handleViewDevices = (record: any) => {
  currentUser.value = record
  deviceDrawerVisible.value = true
}

const handleDelete = async (record: any) => {
  const resp = await deleteAppUser(record.id)
  if (resp.status === 200 || resp.success) {
    message.success('删除成功')
    loadData()
  }
}

const handleToggleStatus = async (record: any) => {
  const action = record.status === 1 ? disableAppUser : enableAppUser
  const label = record.status === 1 ? '禁用' : '启用'
  const resp = await action(record.id)
  if (resp.status === 200 || resp.success) {
    message.success(`${label}成功`)
    loadData()
  }
}

const handleResetPassword = (record: any) => {
  resetPwdUserId.value = record.id
  newPassword.value = ''
  resetPwdVisible.value = true
}

const confirmResetPassword = async () => {
  if (!newPassword.value || newPassword.value.length < 8) {
    message.warning('密码至少 8 位')
    return
  }
  resetPwdLoading.value = true
  try {
    const resp = await resetAppUserPassword(resetPwdUserId.value, newPassword.value)
    if (resp.status === 200 || resp.success) {
      message.success('密码重置成功')
      resetPwdVisible.value = false
    }
  } finally {
    resetPwdLoading.value = false
  }
}

const onEditSuccess = () => {
  editVisible.value = false
  loadData()
}

// -----------------------------------------------------------------------
// 初始化
// -----------------------------------------------------------------------
onMounted(() => {
  loadData()
})
</script>

<style lang="less" scoped>
.app-user-container {
  padding: 16px;
  background-color: #fff;
  border-radius: 4px;

  .search-bar {
    margin-bottom: 16px;
    padding: 16px;
    background-color: @font-gray-50;
    border-radius: 4px;
  }
}
</style>
