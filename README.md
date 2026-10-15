# 工业自动化能力展示站

Vite / React / TypeScript 静态展示站，包含首页及上位机、PLC、运动控制、机器视觉四个详情页。运行素材随站点发布，无后端接口或外部 CDN 依赖。

## 当前展示

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

现有测试覆盖 8 个文件、47 项测试。生产输出目录为 `dist`。

## GitHub Pages

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 自动执行类型检查、Lint、测试、构建并发布 Pages。使用 `HashRouter` 与相对资源路径，支持项目子路径。

公开地址为 [工业自动化能力图谱](https://hst-hanyao.github.io/industrial-automation-showcase/)。备案号码和公安原图来自项目交接；官方网站查询受脚本或反爬限制时，页面可访问与链接正确不代表已独立取得官方备案查询结果。自定义域名的其他托管平台需要分别确认部署状态。

### 晶圆电镀设备演示

`public/waferplt/` 随现有 Vite 构建复制到 `dist/waferplt/`，访问 [完整演示](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/) 或 [APT／PLT／SRD 总览](https://hst-hanyao.github.io/industrial-automation-showcase/waferplt/modules/)。包含预构建三维页、Anatomy 结构图、四段影片和公开专利证据；不包含 Windows 作者工具链。该内容属于公开专利教学重建，未验证真实设备或工艺配方。
