export interface TourItem {
  readonly id: string
  readonly index: string
  readonly tag: string
  readonly title: string
  readonly highlights: readonly string[]
  readonly actionText: string
  readonly route: string
  readonly isExternal?: boolean
}

export const tourItems: readonly TourItem[] = [
  {
    id: 'hmi',
    index: '01',
    tag: 'HMI / SUPERVISORY',
    title: 'WPF 工业上位机系统与调用链',
    highlights: [
      '4 条端到端真实调用链：状态读取、手动写入、配方保存、历史曲线',
      'ADS 100ms 周期轮询与 UI 投影快照，分层解耦无锁绑定',
      'PLC 双缓冲成组读取，保证高频采样下 55+ FPS 界面流畅不卡顿',
    ],
    actionText: '查看上位机架构',
    route: '/hmi',
  },
  {
    id: 'plc',
    index: '02',
    tag: 'PLC / TWINCAT 3',
    title: 'TwinCAT 3 实时任务分层与 PackML 状态机',
    highlights: [
      '三任务时间尺度：2ms LogicTask · 1ms MotionTask · 200ms Visu 刷新',
      'PackML (ISA-TR88) 标准设备状态机，实现运行、暂停与中止闭环',
      'PLT 4 类阀控功能块、五阀三轴互锁及 684 字节 ADS 紧凑状态包',
    ],
    actionText: '查看 PLC 架构',
    route: '/plc',
  },
  {
    id: 'twin',
    index: '03',
    tag: 'DIGITAL TWIN & 3D',
    title: '3D 机械孪生与半导体工艺推演',
    highlights: [
      '16 轴三维拉弯机正运动学仿真（FK），左右 16 轴空间级联与拖链联动',
      '半导体晶圆电镀整机单步教学工作台，腔室工位空间关系精确映射',
      '晶圆干湿分类承托实时跟踪与平滑相机视角过渡',
    ],
    actionText: '进入 16 轴拉弯机',
    route: '/stretch-bender/',
    isExternal: true,
  },
  {
    id: 'vision',
    index: '04',
    tag: 'MACHINE VISION',
    title: 'OpenCV & HALCON 工业视觉双引擎工作台',
    highlights: [
      'OpenCvSharp 4.13：76 项原子算子（纯算法边界）+ 9 大专用组合算子',
      'HALCON 24.11：281 项算子目录 + 分支/循环配方引擎 + 59 项自动冒烟测试',
      '海康威视 MVS SDK 原生直驱，Bayer12 原始无损帧直采与畸变标定',
    ],
    actionText: '查看视觉工作台',
    route: '/vision',
  },
  {
    id: 'cases',
    index: '05',
    tag: 'TROUBLESHOOTING',
    title: '现场疑难攻坚与工程排查实录',
    highlights: [
      '案例 01：伺服启停模拟量跳变，双电源隔离（脏电/干净电分立）与 360° 接地',
      '案例 02：TwinCAT 跨任务并发与上位机异步读写撕裂，单写者与 SequenceID 握手',
      '案例 03：RS-485 单线悬空伪差模压差，双线同步切断规程与总线偏置防呆',
    ],
    actionText: '查看问题排查详情',
    route: '/cases',
  },
] as const
