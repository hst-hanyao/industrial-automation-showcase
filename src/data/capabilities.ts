export const capabilityIds = ['hmi', 'plc', 'motion', 'vision'] as const

export type CapabilityId = (typeof capabilityIds)[number]

export type EvidenceKind = 'project' | 'review' | 'design'

export interface MediaAsset {
  readonly file: string
  readonly alt: string
  readonly caption: string
  readonly width: number
  readonly height: number
}

export interface EvidenceSection {
  readonly id: string
  readonly kind: EvidenceKind
  readonly eyebrow: string
  readonly title: string
  readonly summary: string
  readonly points: readonly string[]
  readonly code?: readonly string[]
  readonly media?: readonly MediaAsset[]
  readonly diagram?: 'projection' | 'tasks' | 'state' | 'axes' | 'stops' | 'pipeline' | 'wafer'
}

export interface Capability {
  readonly id: CapabilityId
  readonly order: string
  readonly route: `/${CapabilityId}`
  readonly shortName: string
  readonly EnglishName: string
  readonly title: string
  readonly lead: string
  readonly proofLine: string
  readonly accent: string
  readonly accentSoft: string
  readonly tags: readonly string[]
  readonly heroMedia?: MediaAsset
  readonly sections: readonly EvidenceSection[]
  readonly primaryDocument?: {
    readonly title: string
    readonly lead: string
    readonly proofLine: string
  }
}

export const evidenceLabels: Record<EvidenceKind, string> = {
  project: '项目证据',
  review: '源码或案例复盘',
  design: '设计说明',
}

export const capabilities: readonly Capability[] = [
  {
    id: 'hmi',
    order: '01',
    route: '/hmi',
    shortName: '上位机',
    EnglishName: 'HMI / SUPERVISORY',
    title: '工业上位机系统',
    lead: '以晶圆电镀设备的 WPF 源码为起点，追踪界面事件、业务方法、数据库访问与 ADS 状态回读。',
    proofLine: 'WPF 源码 + 四条调用链 + 界面截图',
    accent: '#2563eb',
    accentSoft: '#64748b',
    tags: ['WPF', 'Beckhoff ADS', 'SQLite', 'SQL Server'],
    heroMedia: {
      file: 'hmi-dashboard.png',
      alt: '晶圆电镀设备上位机总览页面，包含设备状态、工艺参数、趋势和报警区域',
      caption: 'Runtime overview / 已有界面材料',
      width: 1588,
      height: 894,
    },
    sections: [
      {
        id: 'implementation-boundaries',
        kind: 'project',
        eyebrow: 'Runtime and simulation',
        title: '界面、数据来源与模拟模式',
        summary: '以界面截图和源码调用链说明控件、数据绑定与运行模式。',
        points: [
          '自动流程截图展示任务状态和四个操作入口的布局。',
          '机器人调试与取放演示使用本地模拟。',
          'ADS 客户端连接控制器，Mock 客户端提供本地模拟数据。',
          '主程序集包含仪表、趋势和管路控件。数据绑定路径可在状态读取调用链中查看。',
        ],
      },
      {
        id: 'buffering',
        kind: 'design',
        eyebrow: 'Acquisition concept',
        title: '高频曲线采样的双缓冲设计',
        summary: '设计说明介绍如何用 PLC 双缓冲和上位机成组读取组织高频采样。',
        points: [
          'PLC 写入当前缓冲区，上位机按批读取已提交的缓冲区。',
          '完整标志标记提交时点，序号标识批次，覆盖保护避免读取中途被改写。',
        ],
      },
    ],
  },
  {
    id: 'plc',
    order: '02',
    route: '/plc',
    shortName: 'PLC',
    EnglishName: 'PLC / TWINCAT',
    title: 'TwinCAT 官方案例源码复盘',
    lead: '从任务入口追踪模式命令、设备状态机和动作步骤，梳理 TwinCAT 官方案例的任务划分与适用范围。',
    proofLine: '官方案例源码 + 调用链复盘 + 工程设计说明',
    accent: '#52657f',
    accentSoft: '#64748b',
    tags: ['TwinCAT', 'IEC 61131-3', 'State Machine', 'Task Model'],
    primaryDocument: {
      title: 'PLC 程序框架',
      lead: '以晶圆电镀设备为例，查看 PLC 任务划分、整机与腔室交接、自动操作流程及 PackML 状态流转。',
      proofLine: '交互式架构说明 + 单片执行流程 + PackML 双语说明',
    },
    sections: [
      {
        id: 'tasks',
        kind: 'review',
        eyebrow: 'Official case / task architecture',
        title: '三条任务对应三种时间尺度',
        summary: '数字越小优先级越高。快速控制、业务服务与可视化刷新被放入不同周期，源码复盘从各任务入口按真实调用顺序展开。',
        points: [
          '2 ms：读输入、算逻辑、写输出，并刷新夹具与输送设备块。',
          '10 ms：HMI、报警、导航、模式、Recipe 与系统诊断。',
          '200 ms：TwinCAT Visualization 页面变量绑定与刷新。',
        ],
        code: ['MAIN_Fast_2ms', 'MAIN_Normal_10ms', 'VisuElems.Visu_Prg'],
        diagram: 'tasks',
      },
      {
        id: 'fast-chain',
        kind: 'review',
        eyebrow: 'Official case / fast path',
        title: '2 ms 入口保持读、算、写骨架',
        summary: '顶层入口只做输入投影、逻辑调用和输出投影；设备逻辑再进入全局夹具与输送实例。这段源码展示周期调用关系。',
        points: [
          'Act_Inputs() 与 Act_Outputs() 每周期被调用。',
          '案例将 IO 映射主体写在注释中，用来展示映射位置。',
          '物理 IO 映射按设备点表与通道配置建立。',
        ],
        code: ['Act_Inputs();', 'MAIN_Logic();', 'Act_Outputs();'],
      },
      {
        id: 'state-machine',
        kind: 'review',
        eyebrow: 'Official case / invocation',
        title: '整机请求进入设备模式，再进入工艺步骤',
        summary: 'HMI 请求先写入系统命令；夹具与输送设备读取请求，由 SysStep 选择 Home、Manual 或 Auto，再由动作步骤执行具体序列。',
        points: [
          '整机命令、设备模式、工艺步骤是可复用的三层骨架。',
          '跨任务状态需要唯一写入者和完整快照。',
          '这条调用链展示模式选择和动作分派，设备回零与停止行为由实际控制策略定义。',
        ],
        code: ['MAIN_MoldSwitch → RqSys*', 'APP_Clamp / APP_Conv → SysStep', 'HomeStep / ManualStep / AutoStep'],
        diagram: 'state',
      },
      {
        id: 'audit',
        kind: 'review',
        eyebrow: 'Official case / source audit',
        title: '案例中的 IO、停止与模式处理',
        summary: '对照源码记录 IO 映射位置、停止调用、模式来源及周期执行关系。',
        points: [
          '案例在注释中展示 IO 映射，仿真反馈走同一条状态路径。',
          '案例中的 aMoveOff 通过撤销 Execute 结束动作。',
          '模式请求从多个入口写入，回零逻辑与 Recipe 文件读写各有独立入口。',
          'MAIN_HMI() 在 10 ms 入口的同一扫描内执行两次。',
        ],
      },
      {
        id: 'production-target',
        kind: 'design',
        eyebrow: 'Engineering interface design',
        title: '任务、命令与配方的接口设计',
        summary: '接口设计以任务分层为基础，定义 IO 镜像、命令握手、状态快照、错误处理、步骤超时、停止层级及配方切换规则。',
        points: [
          '命令包含请求号、确认、完成、拒绝与错误上下文。',
          '步骤同时说明完成条件、超时条件和中止行为。',
          'Recipe 先进入 staging，校验后再原子切换。',
        ],
      },
    ],
  },
  {
    id: 'motion',
    order: '03',
    route: '/motion',
    shortName: '运动控制',
    EnglishName: 'MOTION / ZMOTION',
    title: '运动控制与 SDK 语义',
    lead: '从界面动作追到控制器实现与 ZAux_* 调用，检查轴映射、插补、缓冲输出、正常停止和急停是否保持真实语义。',
    proofLine: '控制器调用链 + SDK 语义 + 信号核对方法',
    accent: '#0e7490',
    accentSoft: '#466778',
    tags: ['ZAux_*', 'ADDAX', 'Interpolation', 'Buffered Output'],
    heroMedia: {
      file: 'motion-code-runtime.svg',
      alt: '运动控制核心代码、控制器调用链和运行界面组合图',
      caption: '展示材料 / 控制器调用链',
      width: 1400,
      height: 820,
    },
    sections: [
      {
        id: 'call-chain',
        kind: 'review',
        eyebrow: 'Controller call chain',
        title: '界面事件必须追到底层 ZAux_* 返回值',
        summary: '业务层负责参数与状态判断，控制器实现把动作映射到 SDK。统一接口可以隔离品牌差异，但不能吞掉原生返回值和错误上下文。',
        points: [
          'UI Command → Motion Service → Controller → Native SDK。',
          '连接、参数、轴故障与命令拒绝都回到状态层。',
          '界面只显示控制器反馈，不根据点击动作猜测运动结果。',
        ],
        code: [
          'ZAux_Direct_SetSpeed(handle, axis, speed)',
          'ZAux_Direct_Single_MoveAbs(handle, axis, target)',
          'Check(result, commandContext)',
        ],
        media: [
          {
            file: 'motion-code-runtime.svg',
            alt: '运动控制 C# 包装层、ZAux 调用与运行状态组合图',
            caption: '源码或案例复盘 / 调用链材料',
            width: 1400,
            height: 820,
          },
        ],
      },
      {
        id: 'axes-buffer',
        kind: 'review',
        eyebrow: 'Interpolation & buffer',
        title: '先建立轴组，再下发插补与缓冲事件',
        summary: '多轴联动不是同时发出多个单轴 Move。轴通过 ADDAX 进入同一插补组，路径段和输出事件再按控制器缓冲顺序执行。',
        points: [
          '轴号、重复映射和控制器状态在流程开始前检查。',
          '完成或异常退出时释放轴组，避免继承旧映射。',
          '缓冲输出与路径位置关联，不用上位机定时器估算后切 IO。',
        ],
        diagram: 'axes',
      },
      {
        id: 'stop-semantics',
        kind: 'review',
        eyebrow: 'Stop semantics',
        title: '正常停止、急停与复位',
        summary: '两种停止都会取消上位机流程等待，但必须落到不同控制器调用；急停后进入锁定或故障状态，复位前禁止新运动命令。',
        points: [
          '正常停止：ZAux_Direct_Single_Cancel，按受控方式结束当前运动。',
          '急停：ZAux_Direct_Rapidstop，随后要求明确复位与重新启动条件。',
          '停止行为通过返回码、轴状态和控制器反馈确认。',
        ],
        code: ['Stop → ZAux_Direct_Single_Cancel', 'EmergencyStop → ZAux_Direct_Rapidstop'],
        diagram: 'stops',
      },
      {
        id: 'verification',
        kind: 'design',
        eyebrow: 'Controller diagnostics',
        title: '控制器调用与反馈核对方法',
        summary: '这份核对方法按 SDK 接口、控制器状态和异常恢复三个层次组织。',
        points: [
          '核对 Native DLL 导出函数、平台位数和 SDK 版本。',
          '用控制器返回码、轴反馈和缓冲状态追踪每次指令。',
          '故障与中止路径按状态变化记录，便于关联命令和反馈。',
        ],
      },
    ],
  },
  {
    id: 'vision',
    order: '04',
    route: '/vision',
    shortName: '机器视觉',
    EnglishName: 'VISION / OPENCV',
    title: 'OpenCV 机器视觉工作台',
    lead: '围绕晶圆去边与外圈均匀性检测，把算法拆成标定、方法库、流程编辑、配方、距离统计和可解释记录。',
    proofLine: '工作台截图 + 流程结构 + 外圈检测说明',
    accent: '#59677c',
    accentSoft: '#59677c',
    tags: ['OpenCvSharp', 'Calibration', 'Pipeline', 'Edge Distance'],
    heroMedia: {
      file: 'vision-workbench.png',
      alt: '机器视觉流程设置页面，包含步骤列表、方法库、参数和配方区域',
      caption: 'Vision workbench / 已有界面材料',
      width: 1588,
      height: 894,
    },
    sections: [
      {
        id: 'wafer-edge',
        kind: 'project',
        eyebrow: 'Wafer edge inspection',
        title: '晶圆外圈距离与连续性检测',
        summary: '外圈目标与背景可能亮度接近，单一阈值并不稳定。展示方案采用轮廓提取、配准和沿法向距离测量来组织检测。',
        points: [
          '工艺关注外圈是否正确去除以及镀层是否连续、均匀。',
          '参考轮廓与检测轮廓需要先完成配准。',
          '距离统计为后续判定提供偏移、离散程度与极值。',
        ],
        diagram: 'wafer',
      },
      {
        id: 'workbench',
        kind: 'project',
        eyebrow: 'Reusable workbench',
        title: '方法、参数、配方与执行流程分离',
        summary: '输入、标定、预处理、轮廓、配准、距离统计、判定和记录都是独立节点，由流程配方决定顺序，不把视觉能力写成一个巨型按钮。',
        points: [
          '方法只接收声明的输入，并把结果写入上下文变量。',
          '流程步骤、启用状态和参数可独立配置。',
          '中间图、输出变量和最终判定保留可解释记录。',
        ],
        media: [
          {
            file: 'vision-workbench.png',
            alt: '视觉流程编辑与方法库页面，展示步骤、参数和配方分离',
            caption: '项目证据 / OpenCV 工作台',
            width: 1588,
            height: 894,
          },
        ],
        diagram: 'pipeline',
      },
      {
        id: 'distance',
        kind: 'project',
        eyebrow: 'Algorithm evidence',
        title: '沿参考轮廓法向输出带符号距离',
        summary: '配准后沿参考曲线采样法向，与检测外缘求交并计算带符号距离；统计结果交给独立判定节点，不在绘图层中暗藏结论。',
        points: [
          '参考轮廓、检测轮廓与采样点保持各自数据角色。',
          '输出可包含 shift、IQR、min、max、mean 与标准差。',
          '阈值和判定条件属于配方，不硬编码在可视化控件中。',
        ],
        code: [
          'Align(referenceContour, detectedContour)',
          'MeasureSignedNormalDistances(alignedEdges)',
          'PublishStatistics(context)',
        ],
      },
      {
        id: 'halcon-direction',
        kind: 'design',
        eyebrow: 'Method interface design',
        title: '算法库与流程节点的接口设计',
        summary: 'OpenCvSharp 工作台通过步骤契约组织图像输入、参数、结果与诊断信息。',
        points: [
          '步骤声明输入图像、参数类型和输出变量。',
          '流程编辑器通过统一接口加载方法，配方记录方法和参数。',
          '执行记录保留步骤输入、结果及异常，便于复现。',
        ],
      },
    ],
  },
] as const

export function getCapability(id: CapabilityId): Capability {
  const capability = capabilities.find((item) => item.id === id)

  if (!capability) {
    throw new Error(`Unknown capability: ${id}`)
  }

  return capability
}

export function getCapabilityNeighbors(id: CapabilityId): {
  readonly previous: Capability
  readonly next: Capability
} {
  const index = capabilities.findIndex((item) => item.id === id)
  const previousIndex = (index - 1 + capabilities.length) % capabilities.length
  const nextIndex = (index + 1) % capabilities.length

  return {
    previous: capabilities[previousIndex]!,
    next: capabilities[nextIndex]!,
  }
}

export const localMediaFiles = [
  'hmi-dashboard.png',
  'hmi-device-map.png',
  'hmi-plating-chamber.svg',
  'hmi-auto-process.png',
  'hmi-recipe.png',
  'hmi-alarm-event.png',
  'hmi-ads-code.png',
  'motion-code-runtime.svg',
  'vision-workbench.png',
] as const
