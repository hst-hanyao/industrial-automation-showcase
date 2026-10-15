# 晶圆电镀工艺3D教学演示与工业自动化能力图谱

网站根地址默认展示工业自动化能力图谱，使用 Vite / React / TypeScript，包含首页及上位机、PLC、运动控制、机器视觉四个详情页。网页右上角提供进入晶圆电镀工艺3D教学演示的小字链接，设备独立入口为 `/waferplt/`。运行素材随站点发布，无后端接口或外部 CDN 依赖。

## 当前展示

- 默认首页恢复原能力图谱封面；整机、APT、PLT、SRD、前后手臂、结构图与影片保持原功能。设备页通往能力图谱的返回按钮继续隐藏，源码链接保留。
- 设备入口、独立三维页和结构图显示非官方教学声明；主品牌采用中性教学名称。页面上的专利、厂商及研究文档来源跳转已移除，必要的专利号、出处文字和第三方许可保留。链接移除不改变原素材的权利状态。
- 设备入口的「前后手臂」标签进入独立三维教学：前手臂管理 FOUP、定向与干片交接，后手臂用独立干／湿末端连接 APT、PLT、SRD；支持分视角、播放／暂停、原子动作单步、时间轴、运动轴读数及入片交接未就绪的持片等待。只有 SRD 干燥完成后，干片末端才接回晶圆。
- 根地址与显式哈希入口 `/#/` 均加载能力图谱；四个详情地址 `/#/hmi`、`/#/plc`、`/#/motion`、`/#/vision` 保持兼容。公共页头右上角的小字链接直达 `/waferplt/`，首页正文恢复“从上位机进入”与“查看四域图谱”两个原有入口。
- 能力图谱继续使用原 HashRouter；进入独立 3D 目录时才加载设备模型。
- 7 份原始专利 PDF 和 15 张原始专利页图片已从 `public` 移出，不进入 `dist` 或 Pages 新版本。22 份本地备份、原始元数据和逐文件 SHA-256 清单位于仓库外 `../local-backups/20261015-patent-originals/`，未加入 Git 或构建。公开参考目录保留专利号、标题、出处与适用边界，取消原图加载和本地副本索引。本次不改写已有 Git 历史。
- 白蓝灰主题，桌面优先并支持手机阅读与可展开导航。
- 首页设备概念插画明确标注 AI 生成，不作为项目实拍。
- 上位机提供六组架构总览、完整架构、四条真实调用链、源码预览与阅读。
- 源码片段包含相对文件路径及原始行号；当前快照日期为 2026-10-04。
- 五张真实界面截图支持画廊切换和原尺寸查看。
- 五个路由的公共页脚与设备演示的九处既有页脚均显示两项备案信息：ICP备案号「浙ICP备2026082555号-1」和公安备案号「浙公网安备33020002001289号」，分别链接至工信部和公安备案查询网站。
- 公安备案图标采用交接提供的原始 20×20 PNG；备案链接支持键盘操作、窄屏换行与新窗口提示。

自动流程静态展示、Mock 和机器人本地模拟均按页面标签区分，不代表真实设备或现场验收。

## 开发与验证

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

现有测试覆盖 9 个文件、61 项测试，其中14项验证前后手臂的单片归属、干湿分工、独立运动学、FOUP插片高度、交接错峰与动作连续性。生产输出目录为 `dist`。

## GitHub Pages

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 自动执行类型检查、Lint、测试、构建并发布 Pages。使用 `HashRouter` 与相对资源路径，支持项目子路径。

公开首页为 [工业自动化能力图谱](https://hst-hanyao.github.io/industrial-automation-showcase/)，[晶圆电镀工艺3D教学演示](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/) 保留独立入口。备案号码和公安原图来自项目交接；官方网站查询受脚本或反爬限制时，页面可访问与链接正确不代表已独立取得官方备案查询结果。自定义域名由项目所有者单独更新。

### 晶圆电镀设备演示

`public/waferplt/` 随现有 Vite 构建复制到 `dist/waferplt/`，访问 [完整演示](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/) 或 [APT／PLT／SRD 总览](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/modules/)。包含预构建三维页、Anatomy 结构图、四段原影片与必要出处文字；不包含原始专利 PDF、专利页图片或 Windows 作者工具链。该内容属于公开资料教学重建，未验证真实设备或工艺配方。

### 前后手臂教学

[前后手臂独立入口](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/robots/) 为同一 Vite 构建的第二个 HTML 入口，源码在 `waferplt/robots/index.html` 和 `src/wafer-handling/`，样式在 `src/styles/wafer-handling.css`。`kinematics.ts` 从绝对时间确定唯一晶圆归属与两套独立姿态，`geometry.ts` 创建实体机构，`main.ts` 管理渲染与交互。Three.js 固定为0.170.0，与原演示一致，无外部CDN或字体依赖。

布局、两交接位和干湿专用末端是综合公开资料的独立教学方案，不能视为 Lam／Novellus／ACM 的统一标配。原整机保留简化搬运并明确引导此专页；原整机、工艺结构图及影片继续保留。专页另有独立录制的28秒静音概览，压缩教学时间而非真实节拍。可视净空与软件互锁检查不构成真实 CAD 碰撞认证、洁净度或现场安全验收。
