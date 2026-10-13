import type { MediaAsset } from './capabilities'

export interface HmiGalleryItem extends MediaAsset {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly boundary: string
}

export const hmiGalleryItems: readonly HmiGalleryItem[] = [
  {
    id: 'overview', label: '数据总览', file: 'hmi-dashboard.png', width: 1588, height: 894,
    alt: '晶圆电镀上位机总览界面，展示工艺设备、仪表、趋势与报警区域',
    caption: '已有界面材料 / 数据总览',
    description: '在一张界面中查看设备结构、工艺参数与状态投影。',
    boundary: '画面为已有界面材料；控件存在不表示每个区域都已接入真实 PLC 数据。',
  },
  {
    id: 'device-map', label: '设备地图', file: 'hmi-device-map.png', width: 1588, height: 894,
    alt: '上位机设备地图，包含腔室、机器人、晶圆盒和工艺模块入口',
    caption: '已有界面材料 / 设备地图',
    description: '设备地图呈现空间结构，并提供进入各腔室的入口。',
    boundary: '机器人调试及取放演示使用本地模拟，不发送机器人 ADS 指令。',
  },
  {
    id: 'recipe', label: '配方管理', file: 'hmi-recipe.png', width: 1588, height: 894,
    alt: '上位机配方管理页面，包含配方列表、编辑参数和保存操作',
    caption: '已有界面材料 / 配方管理',
    description: '页面保存事件进入业务方法，再通过 SQLite 事务持久化配方与步骤。',
    boundary: '保存关系依据当前源码；本站不执行数据库写入，也不连接设备。',
  },
  {
    id: 'events', label: '报警事件', file: 'hmi-alarm-event.png', width: 1588, height: 894,
    alt: '上位机报警与事件页面，包含记录查询和追溯信息',
    caption: '已有界面材料 / 报警事件',
    description: '报警、事件与审计信息为工程追溯提供界面入口。',
    boundary: '此图不是独立历史曲线截图；历史趋势加载通过真实源码说明。',
  },
  {
    id: 'auto', label: '自动流程 · 静态', file: 'hmi-auto-process.png', width: 1588, height: 894,
    alt: '上位机自动流程静态展示页面，包含启动、暂停、继续与停止按钮',
    caption: '已有界面材料 / 自动流程静态展示',
    description: '展示晶圆任务、流程状态和操作入口的页面组织。',
    boundary: '当前自动流程按钮尚未转发 PLC Auto 操作，不作为真实流程控制证据。',
  },
]
