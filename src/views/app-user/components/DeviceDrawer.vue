<template>
  <a-drawer
    v-model:open="visible"
    :title="`${user?.nickname || user?.username} 的关联设备`"
    :width="860"
    @close="$emit('close')"
  >
    <!-- 搜索栏 -->
    <div style="margin-bottom: 16px">
      <a-row :gutter="12" align="middle">
        <a-col :span="6">
          <a-select
            v-model:value="filterType"
            placeholder="关联类型"
            allow-clear
            style="width: 100%"
            @change="loadData"
          >
            <a-select-option value="manage">管理</a-select-option>
            <a-select-option value="bind">绑定</a-select-option>
            <a-select-option value="share">分享</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-button type="primary" @click="loadData">搜索</a-button>
          <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
        </a-col>
        <a-col :span="12" style="text-align: right">
          <a-button @click="loadData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-col>
      </a-row>
    </div>

    <!-- 设备列表表格 -->
    <a-table
      :columns="columns"
      :data-source="deviceList"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 'max-content' }"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'relationType'">
          <a-tag :color="RELATION_TYPE_COLOR[getRelationTypeValue(record.relationType)]">
            {{ getRelationTypeText(record.relationType) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'bindTime'">
          {{ record.bindTime ? new Date(record.bindTime).toLocaleString('zh-CN') : '-' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-popconfirm
            title="确认解绑该设备？"
            ok-text="确认"
            cancel-text="取消"
            @confirm="handleUnbind(record)"
          >
            <a style="color: #ff4d4f">解绑</a>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-empty v-if="!loading && deviceList.length === 0" description="暂无关联设备" />
  </a-drawer>
</template>

<script setup lang="ts" name="AppUserDeviceDrawer">
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { queryAppUserDevices, unbindAppUserDevice } from '@/api/app-user'

const RELATION_TYPE_LABEL: Record<string, string> = {
  manage: '管理',
  bind: '绑定',
  share: '分享',
}

const RELATION_TYPE_COLOR: Record<string, string> = {
  manage: 'purple',
  bind: 'blue',
  share: 'green',
}

const getRelationTypeValue = (rt: any) =>
  typeof rt === 'object' && rt !== null ? rt.value : rt

const getRelationTypeText = (rt: any) =>
  typeof rt === 'object' && rt !== null ? rt.text : (RELATION_TYPE_LABEL[rt] || rt)

const props = defineProps<{
  user: any
}>()

const emit = defineEmits(['close'])

const visible = ref(true)
const loading = ref(false)
const deviceList = ref<any[]>([])
const filterType = ref<string | undefined>(undefined)

const columns = [
  { title: '设备ID', dataIndex: 'deviceId', key: 'deviceId', width: 160 },
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName' },
  { title: '产品ID', dataIndex: 'productId', key: 'productId', width: 150, customCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
  { title: '关联类型', key: 'relationType', width: 90 },
  {
    title: '操作人 ID',
    dataIndex: 'operatorId',
    key: 'operatorId',
    width: 180,
    customRender: ({ text }: any) => text || '-',
  },
  { title: '备注', dataIndex: 'description', key: 'description', ellipsis: true, minWidth: 200 },
  { title: '关联时间', key: 'bindTime', width: 170 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const loadData = async () => {
  if (!props.user?.id) return
  loading.value = true
  try {
    const resp = await queryAppUserDevices(props.user.id, filterType.value)
    if (resp.success) {
      deviceList.value = resp.result || []
    }
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  filterType.value = undefined
  loadData()
}

const handleUnbind = async (record: any) => {
  const resp = await unbindAppUserDevice(props.user.id, record.deviceId)
  if (resp.status === 200 || resp.success) {
    message.success('解绑成功')
    loadData()
  }
}

onMounted(() => {
  loadData()
})
</script>
