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
    badge: 'PLC 实时控制',
    title: 'PLC 与实时控制逻辑',
    category: 'TwinCAT 3 架构 · PackML 标准状态机',
    items: [
      {
        label: '任务时间尺度调度',
        tags: ['2ms 逻辑控制', '1ms 运动控制', '200ms 界面刷新'],
        note: '按扫描周期严格解耦快速实时控制、业务逻辑与上位机界面刷新，避免任务拥塞。',
      },
      {
        label: '标准设备状态机',
        tags: ['PackML 状态模型', '运行模式仲裁', '系统步序控制'],
        note: '实现停止、启动、执行、中止等规范闭环，设备运行状态受控可预测。',
      },
      {
        label: '组件化气阀功能块',
        tags: ['4类气阀功能块', '到位信号反馈', '上升沿受理请求'],
        note: '抽象单控/双控及工作位反馈气阀功能块，新请求采用上升沿判定，消除持续电平误动。',
      },
      {
        label: '安全互锁与仲裁防呆',
        tags: ['下发许可仲裁', '运行维持许可', '模块正忙锁存'],
        note: '下发许可（动作前提）与运行许可（执行维持）双层解耦；模块正忙期间严密屏蔽非安全指令。',
      },
    ],
  },
  {
    id: 'bus',
    index: '02',
    badge: '现场总线与通信',
    title: '工业通信与现场总线',
    category: 'TwinCAT ADS 通信 · EtherCAT 现场总线',
    items: [
      {
        label: 'ADS 状态整包采集',
        tags: ['紧凑数据结构体', '内存镜像对齐', '100ms 周期采集'],
        note: '摒弃零散变量轮询，采用内存紧凑对齐的状态整包传输，单次读取保证全机状态时间一致性。',
      },
      {
        label: '可靠指令握手协议',
        tags: ['请求-应答握手', '版本序列号控制', '防数据读写撕裂'],
        note: '带序号的请求/应答确认机制，杜绝上位机与 PLC 跨任务异步读写造成的指令漏采。',
      },
      {
        label: '现场信号与总线抗扰',
        tags: ['EtherCAT 总线', 'RS-485 差分信号', '模拟量标定', '双电源隔离'],
        note: '模拟量通道标定、RS-485 差分电平防呆、数字量输入滤波及脏电/干净电分立拓扑设计。',
      },
    ],
  },
  {
    id: 'hmi',
    index: '03',
    badge: '工业上位机系统',
    title: '工业上位机系统',
    category: 'C# · WPF 技术栈 · MVVM 架构',
    items: [
      {
        label: '分层架构与 MVVM',
        tags: ['WPF 控件虚拟化', '数据双向绑定', '业务边界隔离'],
        note: '界面展示层、业务调度层与底层通信服务层彻底解耦，UI 主线程保持轻量无锁。',
      },
      {
        label: '高频采样双缓冲',
        tags: ['PLC 内存双缓冲', '成组批量读取', '高帧率平滑曲线'],
        note: 'PLC 写入当前缓冲区，上位机成组读取已提交缓冲区，实现高频曲线采样界面无卡顿。',
      },
      {
        label: '配方管理与生产追溯',
        tags: ['SQLite 本地持久化', 'SQL Server 历史追溯', '参数越限校验'],
        note: '本地工艺配方安全持久化、运行事件审计与生产质量报表存储。',
      },
    ],
  },
  {
    id: 'vision',
    index: '04',
    badge: '工业机器视觉',
    title: '机器视觉双引擎工作台',
    category: 'OpenCV 机器视觉 · HALCON 视觉开发',
    items: [
      {
        label: 'OpenCV 76 项原子算子',
        tags: ['纯算法内核隔离', '圆形感兴趣区', '亚像素寻峰', '轮廓法向测距'],
        note: '纯算法边界与界面及存储层物理隔离，支持晶圆外圈轮廓提取、配准与带符号法向距离统计。',
      },
      {
        label: 'HALCON 配方流程引擎',
        tags: ['249 项原生算子', '32 项专用组合', '分支与循环判定', '自动化冒烟测试'],
        note: '支持数值与逻辑判定、循环分支与样本可行性验证，解耦界面与底层视觉算子调用。',
      },
      {
        label: '工业相机采集与标定',
        tags: ['工业相机 SDK', '原始无损帧直采', '图像畸变矫正'],
        note: '原生 SDK 取流与句柄生命周期管控，全局标定板参数映射实现像素与物理尺寸转换。',
      },
    ],
  },
  {
    id: 'digital-twin',
    index: '05',
    badge: '三维数字孪生',
    title: '数字孪生与三维运动学仿真',
    category: '三维图形引擎 · 正运动学链解算',
    items: [
      {
        label: '16 轴拉弯机运动学',
        tags: ['正运动学级联变换', '局部坐标系解算', '拖链动态联动'],
        note: '建立床身、回转座、滑台及夹头 16 轴空间带动链，支持单轴/整机归零与姿态数据导出。',
      },
      {
        label: '晶圆电镀工艺工作台',
        tags: ['单步工序控制', '干湿片路径跟踪', '视角平滑过渡'],
        note: '整机及料盒、机械手臂、工艺腔室空间状态推演，严格维护干湿末端互锁规则。',
      },
    ],
  },
] as const
