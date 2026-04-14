<template>
  <a-drawer
    v-model:open="visible"
    :title="`${client?.name} - 调用记录`"
    :width="900"
    @close="$emit('close')"
  >
    <!-- 搜索栏 -->
    <div style="margin-bottom: 16px">
      <a-row :gutter="12" align="middle">
        <a-col :span="7">
          <a-range-picker
            v-model:value="timeRange"
            show-time
            :placeholder="['开始时间', '结束时间']"
            style="width: 100%"
            @change="handleSearch"
          />
        </a-col>
        <a-col :span="4">
          <a-select
            v-model:value="searchStatus"
            placeholder="请求状态"
            allow-clear
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option :value="200">成功</a-select-option>
            <a-select-option :value="400">请求错误</a-select-option>
            <a-select-option :value="401">未授权</a-select-option>
            <a-select-option :value="403">禁止访问</a-select-option>
            <a-select-option :value="500">服务器错误</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-space>
            <a-button type="primary" @click="handleSearch">搜索</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 调用记录表格 -->
    <a-table
      :columns="columns"
      :data-source="logList"
      :pagination="pagination"
      :loading="loading"
      row-key="id"
      size="small"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'statusCode'">
          <a-tag :color="record.statusCode === 200 ? 'success' : 'error'">
            {{ record.statusCode }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'requestTime'">
          {{ record.requestTime ? new Date(record.requestTime).toLocaleString('zh-CN') : '-' }}
        </template>
        <template v-else-if="column.key === 'requestBody'">
          <a-tooltip :title="record.requestBody">
            <span class="text-ellipsis">{{ record.requestBody || '-' }}</span>
          </a-tooltip>
        </template>
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup lang="ts" name="AccessLogDrawer">
import { queryApiClientAccessLog } from '@/api/open-api-client'
import type { Dayjs } from 'dayjs'

const props = defineProps<{
  client: any
}>()

defineEmits(['close'])

const visible = ref(true)
const loading = ref(false)
const logList = ref<any[]>([])
const timeRange = ref<[Dayjs, Dayjs] | null>(null)
const searchStatus = ref<number | undefined>(undefined)

const pagination = reactive({
  current: 1,
  pageSize: 15,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '请求路径', dataIndex: 'requestPath', key: 'requestPath', width: 220 },
  { title: '请求方法', dataIndex: 'requestMethod', key: 'requestMethod', width: 80 },
  { title: '状态码', key: 'statusCode', width: 80 },
  { title: '客户端 IP', dataIndex: 'clientIp', key: 'clientIp', width: 140 },
  { title: '请求体', key: 'requestBody', ellipsis: true },
  { title: '请求时间', key: 'requestTime', width: 180 },
  { title: '耗时(ms)', dataIndex: 'responseTime', key: 'responseTime', width: 90 },
]

const loadData = async () => {
  if (!props.client?.id) return
  loading.value = true
  try {
    const terms: any[] = []
    if (searchStatus.value !== undefined) {
      terms.push({ column: 'statusCode', termType: 'eq', value: searchStatus.value })
    }
    if (timeRange.value?.[0]) {
      terms.push({
        column: 'requestTime',
        termType: 'gte',
        value: timeRange.value[0].valueOf(),
      })
      terms.push({
        column: 'requestTime',
        termType: 'lte',
        value: timeRange.value[1].valueOf(),
      })
    }

    const resp = await queryApiClientAccessLog(props.client.id, {
      pageIndex: pagination.current - 1,
      pageSize: pagination.pageSize,
      terms,
      sorts: [{ name: 'requestTime', order: 'desc' }],
    })
    if (resp.success) {
      logList.value = resp.result?.data || []
      pagination.total = resp.result?.total || 0
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const handleReset = () => {
  timeRange.value = null
  searchStatus.value = undefined
  pagination.current = 1
  loadData()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="less" scoped>
.text-ellipsis {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
