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
    version: '.NET Framework 4.8 · OpenCvSharp4 4.13.0 · SQLite 10.0',
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
        desc: '锁定 MvCameraControl.Net 4.8.0.3，原生句柄由专用服务统一托管。优先握手未压缩零丢包 Bayer12 原始帧，杜绝低位图伪造；相机关闭时严格遵循 Cancel -> StopGrabbing -> Close 顺序。',
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
      { title: '图像采集精度', metric: '12-bit Raw', desc: '真实 Bayer12 原始数据直采，保证镀层微弱色差与边缘分辨率。' },
      { title: '测量重复性', metric: '亚像素级', desc: '基于法向距离采样的晶圆去边检测，精度达亚像素分辨率。' },
    ],
  },
  {
    id: 'halcon',
    name: 'HALCON 24.11 工业配方工作台',
    shortName: 'HALCON 配方工作台',
    badge: 'HALCON 24.11 / C# 7.3',
    version: '.NET Framework 4.8 · HALCON 24.11.1 Steady · x64 WPF',
    tagline: '281 项算子目录 · 条件跳转与循环配方引擎 · 59 项自动冒烟测试',
    summary: '基于 MVTec HALCON 24.11 工业级视觉引擎打造的通用视觉工作台。采用 halcon-24.11-traditional2d-v6 目录规范，整合 249 个原生二维算子与 32 个内置组合方法，支持复杂逻辑分支与 59 项冒烟全自动化验证。',
    panels: [
      '相机实时采集',
      '视觉调试控制台',
      '配方流程编排 (分支/循环)',
      'HALCON 算子库 (281项)',
      '物理标定板映射',
    ],
    pillars: [
      {
        title: '281 算子传统二维视觉目录架构',
        desc: '包含 249 个原生二维算子与 32 个内置组合方法。涵盖亚像素边缘提取、形状匹配、测量拟合、区域形态学与色彩空间变换，结构化分类清晰。',
        tags: ['249 原生算子', '32 组合方法', '形状匹配与测量'],
      },
      {
        title: '工业配方流程编排引擎',
        desc: '打破单一顺序流，支持数值/逻辑判定分支、循环迭代、多帧综合策略及样本可行性校验；通过 SQLite schema 6 保证配方资产安全存储与快速加载。',
        tags: ['条件分支', '循环调度', '多帧策略', 'SQLite Schema 6'],
      },
      {
        title: '59 项自动化冒烟验证体系（SmokeTests）',
        desc: '搭建独立的自动回归测试套件 HalconVision.SmokeTests，覆盖算子注册、参数校验、异常拦截与多线程内存释放，保证长时间连续运行稳定性。',
        tags: ['59 项冒烟全通', '自动回归测试', '工程鲁棒性'],
      },
      {
        title: '高精度物理标定板与相机解耦',
        desc: '配套标准标定板模型，通过内参矩阵解算与畸变系数矫正，将图像像素坐标实时映射至物理机械微米尺寸，满足高端工业检测精度需求。',
        tags: ['标定板模型', '物理尺寸映射', '畸变参数求解'],
      },
    ],
    operatorCategories: [
      { category: '滤波与增强', count: '42 算子', examples: ['mean_image', 'gauss_filter', 'emphasize'] },
      { category: '阈值与分割', count: '38 算子', examples: ['threshold', 'dyn_threshold', 'auto_threshold'] },
      { category: '形态学与区域处理', count: '65 算子', examples: ['connection', 'select_shape', 'opening_circle'] },
      { category: '亚像素轮廓与几何拟合', count: '56 算子', examples: ['edges_sub_pix', 'fit_circle_contour_xld'] },
      { category: '特征提取与变换', count: '48 算子', examples: ['area_center', 'moments_region_2nd', 'affine_trans'] },
      { category: '内置工程组合方法', count: '32 组合', examples: ['双圆同心度', '外圈平滑滤波', '多段极值统计'] },
    ],
    verifications: [
      { title: '冒烟测试覆盖', metric: '59 / 59 通', desc: '全自动控制台冒烟测试，保障工业现场长时间稳定运行。' },
      { title: '算子资产储备', metric: '281 项算子', desc: '覆盖绝大部分工业 2D 视觉质检与测量需求。' },
      { title: '流程灵活性', metric: '逻辑闭环', desc: '支持复杂的条件跳转与循环验证，摆脱写死流程的传统缺陷。' },
    ],
  },
] as const
