<template>
  <div class="open-api-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <a-row :gutter="16" align="middle">
        <a-col :span="6">
          <a-input
            v-model:value="searchParams.name"
            placeholder="请输入客户端名称"
            allow-clear
            @press-enter="handleSearch"
            @change="(e: any) => !e.target.value && handleSearch()"
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
            <a-select-option value="enabled">已启用</a-select-option>
            <a-select-option value="disabled">已禁用</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="14">
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
      <template #bodyCell="{ column, record }">
        <!-- 状态 -->
        <template v-if="column.key === 'state'">
          <a-badge
            :status="getStateValue(record.state) === 'enabled' ? 'success' : 'default'"
            :text="getStateText(record.state)"
          />
        </template>

        <!-- IP 白名单 -->
        <template v-else-if="column.key === 'ipWhiteList'">
          <span v-if="record.ipWhiteList && record.ipWhiteList.length">
            <template v-for="(ip, idx) in record.ipWhiteList.split(',').filter((s: string) => s.trim())" :key="ip">
              <a-tag v-if="(idx as number) < 3">{{ ip }}</a-tag>
            </template>
            <a-tag v-if="record.ipWhiteList.split(',').filter((s: string) => s.trim()).length > 3">
              +{{ record.ipWhiteList.split(',').filter((s: string) => s.trim()).length - 3 }}
            </a-tag>
          </span>
          <span v-else class="text-gray">不限</span>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a @click="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a @click="handleConfig(record)">应用配置</a>
            <a-divider type="vertical" />
            <a @click="handleViewLog(record)">调用记录</a>
            <a-divider type="vertical" />
            <a @click="handleGenerateKeys(record)">
              {{ record.appId ? '重置密钥' : '生成密钥' }}
            </a>
            <a-divider type="vertical" />
            <a @click="handleIssueToken(record)">颁发Token</a>
            <a-divider type="vertical" />
            <a
              v-if="getStateValue(record.state) === 'enabled'"
              style="color: #faad14"
              @click="handleToggleStatus(record)"
            >禁用</a>
            <a v-else style="color: #52c41a" @click="handleToggleStatus(record)">启用</a>
            <a-divider type="vertical" />
            <a-popconfirm
              title="确认删除该应用？"
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
      :client-id="editClientId"
      @close="editVisible = false"
      @success="onEditSuccess"
    />

    <!-- 密钥展示对话框 -->
    <a-modal
      v-model:open="keysVisible"
      title="密钥信息"
      :footer="null"
      @cancel="keysVisible = false"
    >
      <a-alert
        type="warning"
        message="SecretKey 明文仅此次展示，请妥善保存！关闭后将无法再次查看。"
        style="margin-bottom: 16px"
        show-icon
      />
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="AppId">
          <a-typography-text copyable :content="keysData.appId">
            {{ keysData.appId }}
          </a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="SecretKey">
          <a-typography-text copyable :content="keysData.secretKey">
            {{ keysData.secretKey }}
          </a-typography-text>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- Token 展示对话框 -->
    <a-modal
      v-model:open="tokenVisible"
      title="Bearer Token"
      :footer="null"
      @cancel="tokenVisible = false"
    >
      <a-alert
        type="info"
        message="Token 有效期 24 小时，请在请求头中携带：Authorization: Bearer {token}"
        style="margin-bottom: 16px"
        show-icon
      />
      <a-typography-paragraph copyable :content="issuedToken" style="word-break: break-all">
        {{ issuedToken }}
      </a-typography-paragraph>
    </a-modal>

    <!-- 调用记录抽屉 -->
    <AccessLogDrawer
      v-if="logDrawerVisible"
      :client="currentClient"
      @close="logDrawerVisible = false"
    />

    <!-- 应用配置抽屉 -->
    <ConfigDialog
      v-if="configVisible"
      :client-id="editClientId || ''"
      @success="onConfigSuccess"
      @close="configVisible = false"
    />
  </div>
</template>

<script setup lang="ts" name="OpenApiClient">
import { SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  queryApiClientList,
  deleteApiClient,
  enableApiClient,
  disableApiClient,
  generateApiClientKeys,
  issueApiClientToken,
} from '@/api/open-api-client'
import EditDialog from './components/EditDialog.vue'
import AccessLogDrawer from './components/AccessLogDrawer.vue'
import ConfigDialog from './components/ConfigDialog.vue'

// -----------------------------------------------------------------------
// 状态
// -----------------------------------------------------------------------
const loading = ref(false)
const tableData = ref<any[]>([])
const editVisible = ref(false)
const editClientId = ref<string | undefined>(undefined)
const logDrawerVisible = ref(false)
const currentClient = ref<any>(null)
const configVisible = ref(false)
const keysVisible = ref(false)
const keysData = reactive({ appId: '', secretKey: '' })
const tokenVisible = ref(false)
const issuedToken = ref('')

const searchParams = reactive({
  name: '',
  status: undefined as string | undefined,
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
  { title: '应用名称', dataIndex: 'name', key: 'name' },
  { title: 'AppId', dataIndex: 'appId', key: 'appId', width: 220 },
  { title: '状态', key: 'state', width: 100 },
  { title: 'IP 白名单', key: 'ipWhiteList' },
  { title: '限流（次/秒）', dataIndex: 'rateLimit', key: 'rateLimit', width: 120 },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    customRender: ({ text }: any) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  { title: '操作', key: 'action', width: 360, fixed: 'right' as const },
]

// -----------------------------------------------------------------------
// 数据加载
// -----------------------------------------------------------------------
const loadData = async () => {
  loading.value = true
  try {
    const terms: any[] = []
    if (searchParams.name) {
      terms.push({ column: 'name', termType: 'like', value: `%${searchParams.name}%` })
    }
    if (searchParams.status) {
      terms.push({ column: 'state', termType: 'eq', value: searchParams.status })
    }

    const resp = await queryApiClientList({
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
  searchParams.name = ''
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
  editClientId.value = undefined
  editVisible.value = true
}

const handleEdit = (record: any) => {
  editClientId.value = record.id
  editVisible.value = true
}

const handleViewLog = (record: any) => {
  currentClient.value = record
  logDrawerVisible.value = true
}

const handleConfig = (record: any) => {
  editClientId.value = record.id
  configVisible.value = true
}

const handleDelete = async (record: any) => {
  const resp = await deleteApiClient(record.id)
  if (resp.status === 200 || resp.success) {
    message.success('删除成功')
    loadData()
  }
}

const handleToggleStatus = async (record: any) => {
  const stateValue = getStateValue(record.state)
  const action = stateValue === 'enabled' ? disableApiClient : enableApiClient
  const label = stateValue === 'enabled' ? '禁用' : '启用'
  const resp = await action(record.id)
  if (resp.status === 200 || resp.success) {
    message.success(`${label}成功`)
    loadData()
  }
}

const handleGenerateKeys = async (record: any) => {
  const resp = await generateApiClientKeys(record.id)
  if (resp.success) {
    // ApiClientKeyResponse 返回 clientId + secretKey；AppId 未变，从 record 取
    keysData.appId = record.appId || ''
    keysData.secretKey = resp.result?.secretKey || ''
    keysVisible.value = true
    loadData()
  }
}

const handleIssueToken = async (record: any) => {
  const resp = await issueApiClientToken(record.id)
  if (resp.success) {
    issuedToken.value = resp.result || ''
    tokenVisible.value = true
  }
}

const onEditSuccess = () => {
  editVisible.value = false
  loadData()
}

const onConfigSuccess = () => {
  configVisible.value = false
  loadData()
}

// -----------------------------------------------------------------------
// 状态处理辅助函数
// -----------------------------------------------------------------------
const getStateValue = (state: any): string => {
  if (!state) return 'disabled'
  return typeof state === 'object' ? state.value : state
}

const getStateText = (state: any): string => {
  if (!state) return '已禁用'
  if (typeof state === 'object') {
    return state.text === '正常' ? '已启用' : state.text
  }
  return state === 'enabled' ? '已启用' : '已禁用'
}

// -----------------------------------------------------------------------
// 初始化
// -----------------------------------------------------------------------
onMounted(() => {
  loadData()
})
</script>

<style lang="less" scoped>
.open-api-container {
  padding: 16px;
  background-color: #fff;
  border-radius: 4px;

  .search-bar {
    margin-bottom: 16px;
    padding: 16px;
    background-color: @font-gray-50;
    border-radius: 4px;
  }

  .text-gray {
    color: @font-gray-500;
  }
}
</style>
