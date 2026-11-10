export interface CasePoint {
  readonly title: string
  readonly desc: string
}

export interface TroubleshootingCase {
  readonly id: string
  readonly index: string
  readonly badge: string
  readonly category: string
  readonly title: string
  readonly summary: string
  readonly symptom: {
    readonly overview: string
    readonly details: readonly string[]
  }
  readonly investigation: {
    readonly overview: string
    readonly steps: readonly string[]
  }
  readonly rootCause: {
    readonly overview: string
    readonly points: readonly string[]
  }
  readonly solution: {
    readonly overview: string
    readonly measures: readonly CasePoint[]
  }
  readonly outcome: {
    readonly metric: string
    readonly desc: string
  }
}

export const engineeringCases: readonly TroubleshootingCase[] = [
  {
    id: 'case-01-emc-power',
    index: '01',
    badge: 'EMC & POWER ISOLATION',
    category: '电气布线 · 供电拓扑 · 抗干扰',
    title: '伺服电机启停干扰模拟量采样跳变与双电源隔离设计',
    summary: '针对提升轴与倾角轴伺服加减速瞬间引起的 4-20mA 模拟量跳变与误报警，实施双电源物理隔离（脏电/干净电分立）、强弱电分槽布线及 360° EMC 屏蔽接地改造。',
    symptom: {
      overview: 'PLT 腔室伺服电机（提升轴/倾角轴）高速运行及加减速瞬间，模拟量传感器产生剧烈高频跳变。',
      details: [
        '镀液流量计与压力传感器（4-20mA 模拟量信号）采样数值跳动高达 15%~25%。',
        '频发触发低流量/压力异常的假性报警，导致正在电镀中的晶圆工序被迫中断。',
        '当电机静止或断开使能时，模拟量读数瞬间恢复平稳（波动 < 0.2%）。',
      ],
    },
    investigation: {
      overview: '排除软件算法缺陷后，通过便携式示波器深入现场排查电磁干扰与走线拓扑。',
      steps: [
        '软件端排查：在 PLC 中加入低通与滑动滤波，虽能减缓显示跳动，但导致流量闭环调节滞后，且无法消除加减速瞬间的超限尖峰。',
        '示波器抓波：探头接入模拟量输入模块端子（AI+ 对 AI-），发现电机加减速瞬间叠加了高达 3V 峰峰值、频率 10kHz~50kHz 的共模高频毛刺，与伺服驱动器 IGBT 斩波频率高度吻合。',
        '走线与接地检查：伺服动力电缆（U/V/W）与 24V 控制线、模拟量屏蔽双绞线在走线槽内紧密捆扎并行达 1.5 米；动力线屏蔽层仅被拧成 15cm“猪尾巴”细线接地，高频感抗过大；传感器端与电柜端双端接地，存在约 0.8V 电位差的地环流。',
      ],
    },
    rootCause: {
      overview: '动力线高频辐射耦合、动力线屏蔽层高频感抗极大、地环流及共用电源轨互扰的综合结果。',
      points: [
        '强弱电缆同槽并走，IGBT 高频 PWM 脉冲通过线间寄生电容向弱电模拟信号强烈耦合。',
        '动力电缆屏蔽层“猪尾巴”接法彻底破坏了高频屏蔽连续性，高频干扰电流无法快速泄流入地。',
        '模拟量传感器与普通电磁阀共用同一组 24V 开关电源，感性负载动作拉跨电源轨并污染模拟地基准。',
      ],
    },
    solution: {
      overview: '确立“双电源供电彻底隔离 + 强弱电空间分立 + 360° 环压接地 + 单端星型接地”综合治理方案。',
      measures: [
        {
          title: '双电源设计（核心措施）',
          desc: '规划两套物理独立的 24V DC 开关电源系统：一路“脏电”（24V_Dirty）专供驱动器控制电源、普通数字量输入输出（DI/DO）、电磁阀线圈、继电器与指示灯等大电流感性与开关负载；另一路“干净电”（24V_Clean）专供高精度模拟量变送器与精密采集模块。两者 0V 在电柜总接地端单点星型短接，杜绝强电流回流污染高灵敏模拟基准。',
        },
        {
          title: '强弱电金属槽物理分道',
          desc: '强电动力电缆与弱电信号电缆分别走在电柜两侧独立的金属线槽中，物理间距保持 ≥200mm；若遇到无法避免的交叉路径，严格采用 90° 垂直交叉，杜绝长距离空间平行耦合。',
        },
        {
          title: '动力电缆 360° EMC 环压接地',
          desc: '彻底拆除驱动器端“猪尾巴”引出线，电缆在进入电柜处使用专用金属 EMC 屏蔽弹簧夹，将外层屏蔽编织网进行 360° 环形大面积金属压接，直接贴合镀锌安装底板，构建超低高频阻抗泄流路径。',
        },
        {
          title: '模拟量屏蔽层单端星型接地',
          desc: '4-20mA 屏蔽双绞线统一改为控制柜侧单端接地，现场传感器端屏蔽层悬空并绝缘包裹，切断地电位差回路；电柜间增设 16mm² 铜等电位跨接排。',
        },
      ],
    },
    outcome: {
      metric: '采样波动由 ±25% 降至 ±0.2% 以内',
      desc: '在伺服全速运行及急加减速工况下，镀液流量与压力读数平稳无毛刺，假报警彻底消除，保证连续镀膜工艺的可靠进行。',
    },
  },
  {
    id: 'case-02-cross-task-concurrency',
    index: '02',
    badge: 'CONCURRENCY & MEMORY INTEGRITY',
    category: 'TwinCAT 3 · 多任务调度 · 状态机防呆',
    title: 'TwinCAT 3 跨任务与上位机异步读写的指令撕裂与握手防呆',
    summary: '针对上位机与 PLC 之间偶发的脉冲指令漏采与状态不一致，推行单写者内存管理原则（Single Writer Rule），并以带 SequenceID 的请求-应答握手协议替代一次性脉冲。',
    symptom: {
      overview: '自动化连续运行时，上位机下发动作指令后界面显示已置位，但 PLC 偶发不执行动作且无报警。',
      details: [
        '现场偶尔出现轴到位后工序卡住等待数秒的现象，发生概率极低（约几千次动作出现 1 次）。',
        '重新点击界面按钮后工序恢复正常，难以在停机调试状态下稳定复现。',
        '上位机与 PLC 无网络中断记录，ADS 通讯链路始终通畅。',
      ],
    },
    investigation: {
      overview: '结合 ADS 通信底层抓包与 TwinCAT 任务模型时间尺度剖析，锁定跨任务并发读写点。',
      steps: [
        'ADS 通信抓包：确认上位机 AdsSyncWriteReq 每次均返回成功（NoError），证明上位机已将指令写入 GVL_HMI.HMI 映射区。',
        '任务模型审视：系统中同时存在 MotionTask（1ms）与 LogicTask（2ms）。部分气阀和轴状态由 1ms 任务直接写回全局结构体，而 2ms 任务的 Interlock 与 Manual 在同周期多次访问。',
        '时序冲突定位：上位机脉冲指令采用“置位 -> 软件延时 -> 复位”。若上位机异步写入恰好发生在 2ms 扫描周期的局部计算中途，且跨越了结构体 4/8 字节内存边界，PLC 仅读到残缺数据就执行清零，导致上升沿（R_TRIG）漏判。',
      ],
    },
    rootCause: {
      overview: '跨任务（1ms / 2ms）与跨进程（HMI 异步线程）对共享内存缺乏原子性保护导致的竞态条件。',
      points: [
        '无锁共享内存缺乏单写者管辖，高速任务打断低速任务导致状态标志瞬态不一致。',
        '“发后即忘（Fire-and-Forget）”的一次性脉冲指令极易在任务扫描窗口错位或网络轻微抖动时被冲刷覆盖。',
      ],
    },
    solution: {
      overview: '确立“单写者原则 + 局部原子拷贝 + SequenceID 请求/应答握手机制”。',
      measures: [
        {
          title: '单写者原则（Single Writer Rule）',
          desc: '严格划定内存写入权限，全局状态每个字段只能在一个固定的任务周期（2ms LogicTask）内写入。1ms MotionTask 仅通过原子任务快照读取命令，严禁跨任务随意篡改全局逻辑状态。',
        },
        {
          title: 'SequenceID 请求-应答握手协议',
          desc: '彻底废除无保障的一次性脉冲，改用状态握手机制：上位机下发动作时附带自增 SequenceID 并置位 Request 信号；PLC 在 2ms 扫描中捕获、校验许可并执行后，回写 Acknowledge 与相同的 SequenceID；上位机校验回执后才撤销 Request。无论网络或任务如何抖动，确保 100% 消费并闭环确认。',
        },
        {
          title: '命令许可与执行许可解耦',
          desc: '命令许可用于动作前判定“能否启动”（例如轴当前未报警且未 Jog），执行许可用于动作中维持“能否继续”（例如中途安全门被打开立刻撤销线圈使能）。两者职责分离，并在模块 Busy 期间拒绝普通新指令。',
        },
      ],
    },
    outcome: {
      metric: '连续 100,000+ 次动作指令零丢失',
      desc: '彻底根除了跨任务异步数据撕裂，自动电镀与取放片工步交接流畅连贯，大幅提升了上位机与 PLC 交互的健壮性。',
    },
  },
] as const
