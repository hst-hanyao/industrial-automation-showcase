export interface VisionPillar {
  readonly title: string
  readonly desc: string
  readonly tags: readonly string[]
}

export interface VisionOperatorCategory {
  readonly category: string
  readonly count: string
  readonly examples: readonly string[]
}

export interface VisionVerification {
  readonly title: string
  readonly metric: string
  readonly desc: string
}

export interface VisionEngine {
  readonly id: 'opencv' | 'halcon'
  readonly name: string
  readonly shortName: string
  readonly badge: string
  readonly version: string
  readonly tagline: string
  readonly summary: string
  readonly panels: readonly string[]
  readonly pillars: readonly VisionPillar[]
  readonly operatorCategories: readonly VisionOperatorCategory[]
  readonly verifications: readonly VisionVerification[]
}

export const visionEngines: readonly VisionEngine[] = [
  {
    id: 'opencv',
    name: 'OpenCvSharp 4.13 工业视觉工作台',
    shortName: 'OpenCvSharp 工作台',
    badge: 'OPENCVSHARP 4.13 / WPF',
    version: '.NET Framework 4.8 · OpenCvSharp4 4.13.0 · Microsoft.Data.Sqlite 10.0.11',
    tagline: '76 项原子算子库 · 纯算法内核解耦 · 海康威视 MVS SDK 原生直驱',
    summary: '面向晶圆边缘质检与工业测量的专用视觉工作台。坚持算法边界纯粹性（Services/VisionAtomic），将算子执行与 WPF UI 及数据持久化彻底剥离，支持 Bayer12 原始无损帧直采与全流程配方编排。',
    panels: [
      '相机采集 (Camera)',
      '视觉调试 (Debug)',
      '流程设置 (Pipeline)',
      '方法库 (76 Methods)',
      '全局标定 (Calibration)',
    ],
    pillars: [
      {
        title: '纯算法边界隔离设计（VisionAtomic）',
        desc: '67 个基础原子算法的 ExecuteCore 均不超过 10 条有效语句，严禁跨层访问 WPF 控件、SQLite 或相机。算法实现只接收入参、校验边界并直接调用 Cv2 API，数据通过无状态管道流转。',
        tags: ['纯算法内核', '无状态管道', '高内聚边界'],
      },
      {
        title: '9 大特色组合原子算子体系',
        desc: '内置晶圆去边与精密测量关键算子：circle_roi（圆形掩模）、fit_circle（圆拟合）、subpixel_peak_refine（亚像素寻峰）、polar_profile_resample（极坐标重采样展开）及法向距离测量。',
        tags: ['亚像素拟合', '极坐标展开', '带符号法向测距'],
      },
      {
        title: '海康威视 MVS SDK 硬件级生命周期管理',
        desc: '使用 MvCameraControl.Net 4.8.0.3 管理原生句柄，支持请求未压缩 Bayer12 原始帧；相机采集效果和丢帧情况需在设备上验证。关闭流程按 Cancel → StopGrabbing → Close 组织。',
        tags: ['MVS SDK 4.8', 'Bayer12 无损采集', '句柄防泄漏'],
      },
      {
        title: '全局畸变矫正与 SQLite 配方管道',
        desc: '在配方执行前统一由 GlobalCalibrationPreprocessor 调用 Cv2.Undistort，使算法免除畸变失真；配方通过 SQLite 事务持久化，输出由冻结 BitmapSource 异步呈现。',
        tags: ['Cv2.Undistort', 'SQLite 事务持久化', 'UI 冻结渲染'],
      },
    ],
    operatorCategories: [
      { category: '图像预处理与滤波', count: '18 算子', examples: ['高斯/双边滤波', '形态学开闭运算', '自适应二值化'] },
      { category: '边缘与亚像素拟合', count: '16 算子', examples: ['Canny 边缘', 'Sobel 梯度', '亚像素寻峰核'] },
      { category: '几何变换与极坐标', count: '14 算子', examples: ['极坐标展开', '透视变换', '仿射配准'] },
      { category: '特征提取与距离统计', count: '19 算子', examples: ['带符号法向求交', '轮廓曲率', '离散点滤波'] },
      { category: '专用组合原子算子', count: '9 组合', examples: ['circle_roi', 'polar_resample', 'fit_circle'] },
    ],
    verifications: [
      { title: '原子算法纯度', metric: '100% 解耦', desc: '算法内核零依赖 WPF UI 与数据库，支持独立单元测试。' },
      { title: '图像采集精度', metric: '12-bit Raw', desc: '支持 Bayer12 原始帧的采集接口；真实相机效果和测量精度需现场验证。' },
      { title: '测量重复性', metric: '亚像素级', desc: '基于法向距离采样的晶圆去边检测，精度达亚像素分辨率。' },
    ],
  },
  {
    id: 'halcon',
    name: 'HALCON 24.11 工业配方工作台',
    shortName: 'HALCON 配方工作台',
    badge: 'HALCON 24.11 / C# 7.3',
    version: '.NET Framework 4.8 · HALCON 24.11.1 Steady · x64 WPF',
    tagline: '282 项算子目录 · 条件跳转与循环配方引擎 · 114 项离线回归测试',
    summary: '基于 MVTec HALCON 24.11 工业级视觉引擎打造的通用视觉工作台。采用 halcon-24.11-traditional2d-v7 目录规范，整合 249 个原生二维算子与 33 个内置组合方法，支持复杂逻辑分支与 114 项离线回归验证。',
    panels: [
      '相机接口（实机待验证）',
      '视觉调试控制台',
      '配方流程编排 (分支/循环)',
      'HALCON 算子库 (282项)',
      '物理标定板映射',
    ],
    pillars: [
      {
        title: '282 算子传统二维视觉目录架构',
        desc: '包含 249 个原生二维算子与 33 个内置组合方法。涵盖亚像素边缘提取、形状匹配、测量拟合、区域形态学与色彩空间变换，结构化分类清晰。',
        tags: ['249 原生算子', '33 组合方法', '形状匹配与测量'],
      },
      {
        title: '工业配方流程编排引擎',
        desc: '打破单一顺序流，支持数值/逻辑判定分支、循环迭代、多帧综合策略及样本可行性校验；使用 schema 8 配置库管理工程配置。',
        tags: ['条件分支', '循环调度', '多帧策略', '配置库 Schema 8'],
      },
      {
        title: '离线回归验证体系（SmokeTests）',
        desc: '搭建独立的自动回归测试套件 HalconVision.SmokeTests，覆盖算子注册、参数校验、异常拦截与多线程内存释放，测试结果仅适用于记录的离线范围，不代表现场长期运行验收。',
        tags: ['114 项离线回归', '自动回归测试', '工程鲁棒性'],
      },
      {
        title: '标定板与相机接口',
        desc: '支持标定板模型和畸变参数处理；实际物理坐标映射与精度需结合设备标定及现场验证。',
        tags: ['标定板模型', '物理尺寸映射', '畸变参数求解'],
      },
    ],
    operatorCategories: [
      { category: '图像、通道与域', count: '27 算子', examples: ['copy_image', 'count_channels'] },
      { category: '滤波、增强与缺陷', count: '51 算子', examples: ['mean_image', 'gauss_filter'] },
      { category: '分割', count: '16 算子', examples: ['threshold', 'dyn_threshold'] },
      { category: '区域与形态学', count: '62 算子', examples: ['connection', 'select_shape'] },
      { category: 'XLD、边缘与轮廓', count: '54 算子', examples: ['edges_sub_pix', 'fit_circle_contour_xld'] },
      { category: '变换与二维几何', count: '39 算子', examples: ['affine_trans'] },
      { category: '内置工程组合方法', count: '33 组合', examples: ['单圆测量'] },
    ],
    verifications: [
      { title: '冒烟测试覆盖', metric: '114 / 114 通', desc: '全自动控制台冒烟测试，2026 年 10 月离线交付记录，不代表现场长期运行验收。' },
      { title: '算子资产储备', metric: '282 项算子', desc: '覆盖绝大部分工业 2D 视觉质检与测量需求。' },
      { title: '流程灵活性', metric: '逻辑闭环', desc: '支持复杂的条件跳转与循环验证，摆脱写死流程的传统缺陷。' },
    ],
  },
] as const
