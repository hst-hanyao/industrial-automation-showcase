export interface TechItem {
  readonly label: string
  readonly tags: readonly string[]
  readonly note: string
}

export interface TechDomain {
  readonly id: string
  readonly index: string
  readonly badge: string
  readonly title: string
  readonly category: string
  readonly items: readonly TechItem[]
}

export const techDomains: readonly TechDomain[] = [
  {
    id: 'plc',
    index: '01',
    badge: 'PLC / IEC 61131-3',
    title: 'PLC 与实时控制逻辑',
    category: 'Beckhoff TwinCAT 3 · PackML (ISA-TR88)',
    items: [
      {
        label: '任务时间尺度调度',
        tags: ['2ms LogicTask', '1ms MotionTask', '200ms Visu'],
        note: '按扫描周期严格解耦快速实时控制、业务逻辑与 HMI/界面刷新，避免任务拥塞。',
      },
      {
        label: '标准设备状态机',
        tags: ['PackML 状态模型', '模式仲裁', 'SysStep'],
        note: '实现 Stopped / Starting / Execute / Aborted 规范闭环，状态受控可预测。',
      },
      {
        label: '组件化气阀功能块',
        tags: ['4类阀控制块', '单双位反馈', '上升沿受理'],
        note: '抽象单控/双控及工作位反馈气阀功能块（FB），新请求上升沿判定，消除持续电平误动。',
      },
      {
        label: '安全互锁与仲裁防呆',
        tags: ['命令许可', '执行许可', '模块Busy锁存'],
        note: '命令许可（下发前提）与执行许可（运行维持）双层解耦；模块 Busy 期间拒绝普通指令。',
      },
    ],
  },
  {
    id: 'bus',
    index: '02',
    badge: 'FIELDBUS & PROTOCOL',
    title: '工业通信与现场总线',
    category: 'Beckhoff ADS · EtherCAT 现场总线',
    items: [
      {
        label: 'ADS 状态整包采集',
        tags: ['684 字节紧凑结构体', '内存镜像对齐', '100ms 轮询'],
        note: '摒弃零散变量轮询，采用内存紧凑对齐的状态整包传输，单次读取保证全机状态时间一致性。',
      },
      {
        label: '可靠指令握手协议',
        tags: ['Request-Ack 握手', 'Sequence ID', '防数据撕裂'],
        note: '带序号的请求/应答确认机制，杜绝上位机与 PLC 跨任务异步读写造成的指令漏采。',
      },
      {
        label: '现场信号与总线抗扰',
        tags: ['EtherCAT', 'RS-485 差分总线', '4-20mA 标定', '双电源解耦'],
        note: '模拟量通道标定、RS-485 差分电平防呆、数字量输入滤波及脏电/干净电分立拓扑设计。',
      },
    ],
  },
  {
    id: 'hmi',
    index: '03',
    badge: 'HMI / SUPERVISORY',
    title: '工业上位机系统',
    category: 'C# · .NET Framework 4.8 · WPF (MVVM)',
    items: [
      {
        label: '分层架构与 MVVM',
        tags: ['WPF 控件虚拟化', 'XAML 数据绑定', '业务边界隔离'],
        note: '界面展示层、ViewModel 协调层与通讯服务层解耦，UI 线程保持轻量无锁。',
      },
      {
        label: '高频采样双缓冲',
        tags: ['PLC 双缓冲', '成组读取', '55+ FPS 平滑'],
        note: 'PLC 写入当前缓冲区，上位机成组读取已提交缓冲区，实现高频曲线采样界面无卡顿。',
      },
      {
        label: '配方与生产追溯',
        tags: ['SQLite 事务持久化', 'SQL Server 历史追溯', '参数校验'],
        note: '本地工艺配方安全持久化、运行事件审计与生产质量报表存储。',
      },
    ],
  },
  {
    id: 'vision',
    index: '04',
    badge: 'MACHINE VISION',
    title: '机器视觉双引擎工作台',
    category: 'OpenCvSharp 4.13 · MVTec HALCON 24.11 Progress',
    items: [
      {
        label: 'OpenCV 76 项原子算子',
        tags: ['纯算法内核隔离', 'Circle ROI', '亚像素寻峰', '法向测距'],
        note: '纯算法边界与 UI/存储隔离，支持晶圆外圈轮廓提取、配准与带符号法向距离统计。',
      },
      {
        label: 'HALCON 配方流程引擎',
        tags: ['249 原生算子', '32 组合方法', '分支/循环/多帧', '59 项冒烟测试'],
        note: '支持数值与逻辑判定、循环分支与样本可行性验证，解耦 UI 与底层 HOperatorSet。',
      },
      {
        label: '相机采集与全局标定',
        tags: ['海康 MVS SDK', 'Bayer12 无损采集', 'Undistort 畸变矫正'],
        note: '原生 SDK 取流与句柄生命周期管控，全局标定板参数映射实现像素与物理尺寸转换。',
      },
    ],
  },
  {
    id: 'digital-twin',
    index: '05',
    badge: 'DIGITAL TWIN & 3D',
    title: '数字孪生与 3D 运动学仿真',
    category: 'Three.js · WebGL · 正运动学链 (FK)',
    items: [
      {
        label: '16 轴拉弯机运动学',
        tags: ['正运动学级联变换', '局部坐标系解算', '拖链动态联动'],
        note: '建立床身、回转座、滑台及夹头 16 轴空间带动链，支持单轴/整机归零与姿态 JSON 导出。',
      },
      {
        label: '晶圆电镀教学工作台',
        tags: ['单步工序控制', '干湿片路径跟踪', '相机平滑过渡'],
        note: '整机及 FOUP/前臂/后臂/APT/PLT/SRD 腔室空间状态推演，严格维护干湿末端互锁规则。',
      },
    ],
  },
] as const
