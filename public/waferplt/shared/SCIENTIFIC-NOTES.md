# 铜电镀教学模型的科学范围 · v2

v2 将整机搬运、面朝下单晶圆电镀腔及 TSV／WLP 微结构连接为三个观察尺度。结构来自 Lam／Novellus 等公开专利的不同实施例，运动与形貌用于解释工序和机理。它不是特定商业机的工程图、工业实测数据或量产工艺预测；不能把公开专利中的“适用设备示例”解释成某台 SABRE 3D 的完整实装清单。

Anatomy 暗／亮色等轴测图保留为 **v1 基础原理参考**，本轮没有重画该 SVG。它解释单晶圆模块、循环和法拉第沉积量，不承诺与 v2 的平台布局、部件或分镜逐项一致。

## 三个尺度与工艺路线

| 观察尺度 | 展示内容 | 证据与简化 |
| --- | --- | --- |
| 整机搬运 | FOUP、前端与湿片搬运、APT、Cu 电镀、清洗／干燥、回片 | 参考公开多工位架构，采用单层示例组合；工位数量、布局、轨迹和节拍为重建选择 |
| 单腔剖面 | cup／cone、唇形密封、阴极触点、阳极、CIRP、独立分隔膜、供回液和所选侧向流 | 多件专利的结构示例组合；没有证据表明该组合对应一台实际出货机 |
| 微结构生长 | TSV 底部优先填充与空洞对照；WLP 铜柱与 RDL 表面线路 | 内衬、胶模和增长前沿单独放大，图形随外部电荷进度变化，不求解局部电化学 |

整机的示例路径为：**装载取片 → APT 清洗／预湿 → 转移 → Cu 电镀 → 清洗／旋转干燥 → 回片**。图中的预湿用于帮助液体进入已形成的特征，避免残留空气；它不是远程等离子处理。实际工艺顺序、液体与压力条件取决于特征、表面和设备配置。

TSV 的深孔、绝缘层、阻挡层和连续种子层在进入本段填铜前已经形成，后续可能还需要过镀层去除、CMP、减薄或其他整合。WLP 铜柱和 RDL 都在连续种子层上的光刻胶开口内电镀；铜柱是离散凸点，RDL 是沿晶圆表面延伸的线路，不能将其画成深硅孔。图中只演示 Cu 阶段；Ni、SnAg 等多金属配置不等于本模型已模拟其合金电化学。去胶、暴露种子层蚀刻、焊料回流与退火等只作为后续可能工序，不假定全部集成在同一机台内。

## 几何、工位与材料假设

晶圆直径固定为 **300 mm**。整机平台预设包络约 **2.80 m × 5.20 m**，用于建立可读的搬运与工位关系，不是实机测绘尺寸。除晶圆直径这一选定规格外，腔体大小、工位数、间距、机械手、轨迹、行程、速度、材质外观和节拍均为教学重建参数；未执行真实机器人碰撞认证、洁净验证或产能标定。

单腔使用面朝下晶圆和下方铜阳极。所选流道方案具有由下向上的供液与侧向流；这些流路来自特定公开实施例，不能概括为所有喷泉腔或所有 SABRE 3D 的统一结构。**CIRP（离子电阻／透过元件）与阴阳极液分隔膜是两个部件**：前者用于影响电流／流动分布，后者可用于分隔两侧液体。模型不求解它们的电阻、选择性、压降或化学隔离效果。

## 可计算的内容

- 晶圆采用完整投影圆面，面积 A = πd²/4；忽略边缘排除区、图形侧壁附加面积和非圆形有效区域。
- 电流密度 j 按投影面积定义；I = jA，不能把它当成每处局部电流密度。
- 恒流时 Q = It；动态时按分段恒流累计 Q = ΣIΔt。这里的 Δt 是累计模型中的示例工艺时间。
- 阴极总铜质量 m = MΣ(ηIΔt)/(2F)。局部反应以 Cu²⁺ + 2e⁻ → Cu 的总计量式表示；不展开中间价态。
- 等效平均厚度 h = m/(ρA)。它是把全部沉积体积均匀摊到投影面积后的等效值，不是孔底增长高度、侧壁厚度或填孔时间。
- flowMS = Qv/(πDpipe²/4)，仅表示示例供液管中的截面平均流速，不表示晶圆表面或微孔内流速，不由其推断传质系数。

参考物性常量：F = 96485.33212331002 C/mol，Cu 摩尔质量 63.546 g/mol，密度 8.96 g/cm³，净沉积每个 Cu 原子按 2 个电子计。物性常量与演示设定应在展示中区分。

## 默认数值与物性常量的区别

晶圆直径 300 mm，投影电流密度 10 mA/cm²，阴极电流效率假设 98%。共享算例另以供液 12 L/min、管内径 20 mm 计算管内平均流速；这些值不是某一工业设备的配方、标定值或实测值。v2 的动画转速、流线速度和搬运节拍另行设定，不由电流或液流求得；供液、转速与局部沉积之间未建立物理耦合。

在以上假设下连续通电 120 s：投影面积约 706.858 cm²，I≈7.06858 A，Q≈848.230 C，铜质量≈0.273739 g，等效平均厚度≈0.432211 μm，等效平均沉积速率≈0.216106 μm/min，管内平均流速≈0.636620 m/s。

若展示可溶铜阳极，其总反应为 Cu → Cu²⁺ + 2e⁻。本模型未返回阳极损耗。若另作计算，需独立注明阳极效率；不能在阴极效率 98% 而阳极效率 100% 时强制两极铜质量严格相同。

## 状态累计、工艺上下文与时钟

`solveAt(t, input)` 是从 t=0 起参数始终不变的无历史算例。`contactOpen: true` 在该接口表示从开始就开路，故 Q=0。动态按钮应调用 `step(state, dt, input)`：旧输入会保留，新输入覆盖；开路令瞬时电流和新增沉积为 0，但保留已累计电荷与铜量，时间仍前进。`effectiveCopperChargeC` 累计 ΣηIΔt，因此改变效率不会追溯改写既有铜量。带电后更改晶圆直径需创建新初态。

调用端使用 `solveAt(0)` 建立初态，随后按帧 `state = step(state, dt, newInput)`。v2 分别保存 **TSV、WLP 铜柱、WLP RDL** 三个累计上下文；切换工艺或子模式时保留各自的电荷、有效铜电荷、铜量及工艺时间，返回时接续该上下文。只对当前选定上下文推进，不能把另一个工艺的历史当成本工艺的沉积。

交互演示以 **8×示例工艺时钟**推进累计模型，即普通运行条件下每个播放秒对应 8 个模型工艺秒。整机视图中只有电镀阶段请求通电；单腔与微结构视图可直接观察受控沉积。开路或 j=0 时 I=0、ΔQ=0、Δm=0，已有电荷与铜量保留；等待或开路期间工艺时间可以继续。暂停不推进时间步，因此时钟、搬运、离子示踪和沉积均冻结。重新开始重建三个初态，是演示复位，不是物理反镀。

电流密度、时间、流量和电荷不接受负数；效率范围为 [0, 1]；直径须大于 0。模型不支持反向脉冲、析氢、腐蚀或双电层充放电。

## 微结构进度不是局部生长预测

动画采用固定参考电荷：

```text
I10 = operatingPoint(10 mA/cm², 300 mm).currentA
Qreference = I10 × 120 s ≈ 848.230016 C
progress = clamp(Q / Qreference, 0, 1)
```

这个 `progress` 仅把累计电荷映射到可读的形貌演示。TSV 铜前沿、铜柱高度与 RDL 线槽中的填充比例都是定性图形，不能由 100% 推断真实填满、给定柱高、线路厚度或良率；也没有将整片投影面积和微结构体积建立局部守恒映射。归一化图形达到 100% 后，电荷、铜量与等效平均铜厚仍可继续增加。

微结构组件没有内部计时器，不从 `time` 或 `currentA` 独立计算增长；宿主统一传入 `progress`。`active` 控制离子示踪相位与状态显示，宿主在断电时保持进度。这样可以在暂停、切换或受控回放时共用同一个累计结果，但不赋予图形预测药液、电位、添加剂或传质作用的能力。

v2 影片规格为 **48 秒、1600×900、24 fps、静音、中文字幕**。影片按分镜压缩或重置各示例阶段的工艺时间，TSV／铜柱／RDL 的展示速度可以不同；影片时长与画面切换均不是量产周期。影片内定量读数仍来自对应示例上下文的法拉第累计。

## 动画科学约束

1. 晶圆待镀面朝下，边缘触点连接连续种子层，背面由夹持与密封结构保护。不能表现成电子穿过裸硅后直接在绝缘层上镀铜。
2. 电子只在金属导线、触点、种子层及电极中示意；液相由离子携带电流。Cu²⁺ 输运与液体流动使用不同符号。液相电流不只由 Cu²⁺ 承担。
3. 大尺度流动可示意对流，表面附近可示意扩散；本模型未求解迁移、浓度场、电场、流场或边界层。粒子轨迹不是单离子追踪结果。
4. bottom-up filling 指从特征内部封闭端向孔口填充，与重力方向无关。微结构剖面按便于阅读的方向绘制，不与面朝下整机建立屏幕上下方向的一一对应；画面中的“孔底”不等于重力下方。
5. 可对比孔口提前封闭留空洞与底部优先填充，但这是不同沉积速率分布的定性展示。正常示意允许少量侧壁增长。不能把形貌动画命名为 CEAC 或 TSV 数值仿真。
6. 不将“加速剂越多越好”“转速越高就不会有空洞”或“底部填充仅有一种机制”作为结论。CEAC 与 TSV 抑制层失效/S-NDR 的适用体系不同。
7. 阴极还原需要在电解液与导电表面的界面发生。正常示意不应默认剧烈析氢；预湿排气是原先困在特征内的空气。
8. 夹持、接触和密封先于受控电镀；退出电镀阶段时先停电，再提片排液并转入清洗／干燥。动画中的站间运动与局部工艺均为顺序说明，不证明实机的密封、真空、互锁或工艺窗口。

## 核心公开专利索引

以下页码按原 PDF 第一页为第 1 页计算；专利来源用于核对结构或工序，不是商业实装认证。

| 原始专利页面 | 使用范围 | 可还原内容与边界 |
| --- | --- | --- |
| [US12241173B2 — Wafer shielding for prevention of lipseal plate-out](https://patents.google.com/patent/US12241173B2/en) | FIG. 9：PDF p11；FIG. 10：p12 | 面朝下单腔与多工位平台关系；正文列 SABRE 3D 为适用设备示例。图 9 的 911 是离子电阻／透过元件，不是分隔膜；新密封方案不据此认定已出货 |
| [US20180251907A1 — Wide lipseal for electroplating](https://patents.google.com/patent/US20180251907A1/en) | FIG. 1／2：PDF p2；FIG. 3／4：p3 | cup／cone、转轴、唇形密封与边缘电接触；正文直接讨论 Sabre 3D，但图仍是示例结构，不是实机 CAD |
| [US10094034B2 — Edge flow element for electroplating apparatus](https://patents.google.com/patent/US10094034B2/en) | FIG. 2：PDF p10；FIG. 4：p13 | CIRP、限流环、膜框、下方供液与横向流入口／出口；未证明 SABRE 3D 商业机必然采用这一升级方案 |
| [US20100200412A1 — Process For Through Silicon Via Filling](https://patents.google.com/patent/US20100200412A1/en) | FIG. 1：PDF p2；FIG. 2：p3；FIG. 3／4：p4／5 | TSV 结构、工艺流程、电镀与前后处理集成；正文同时列 Sabre、Slim Cell、Raider，不能当作 SABRE 3D 专属配置 |
| [US9469912B2 — Pretreatment method for photoresist wafer processing](https://patents.google.com/patent/US9469912B2/en) | FIG. 1A／1B：PDF p4／5；FIG. 2／3：p6 | WLP 胶模、UBM／种子层、电镀及后续去胶、蚀刻、回流路径；可选还原等离子预处理不等于 SABRE 3D 的标配模块 |
| [WO2025174670A1 — Minimizing contamination within substrate cleaning chamber](https://patents.google.com/patent/WO2025174670A1/en) | 正文 [0028]／[0031]；FIG. 1A–1F 的流程说明 | 正文直接说明 SABRE 3D 模块化 APT 的清洗／润湿用途；新防污染屏障与自动清腔是实施例，不据此声称商业实装。未核原 PDF 页码，不用于精确尺寸复原 |

这些专利分属不同时间与发明主题。本模型将它们用于解释平台、夹持、流路和工序关系，不宣称它们来自同一型号、代际或已验证配置。WO2025174670A1 的 FIG. 2 是无晶圆自动清腔循环，不能混入正常晶圆预湿流程。

## 机理文献与物性来源

- [Andricacos et al. 1998，Damascene copper electroplating for chip interconnections，IBM Research](https://research.ibm.com/publications/damascene-copper-electroplating-for-chip-interconnections)，DOI [10.1147/rd.425.0567](https://doi.org/10.1147/rd.425.0567)：种子层、电镀整合、填孔及 CMP。
- [Josell et al. 2001，Superconformal Electrodeposition in Submicron Features，NIST 原文](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=853028)，DOI [10.1103/PhysRevLett.87.016102](https://doi.org/10.1103/PhysRevLett.87.016102)：CEAC、局部覆盖率与几何演化。
- [Moffat et al. 2002，Superconformal Electrodeposition Using Derivitized Substrates，NIST 原文](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=853171)，DOI [10.1149/1.1521290](https://doi.org/10.1149/1.1521290)：催化剂覆盖率的实验验证及过低/过高覆盖率的边界。
- [Josell and Moffat 2018，Superconformal Copper Deposition in Through Silicon Vias by Suppression-Breakdown，NIST](https://www.nist.gov/publications/superconformal-copper-deposition-through-silicon-vias-suppression-breakdown)，DOI [10.1149/2.0061802jes](https://doi.org/10.1149/2.0061802jes)：TSV 抑制层失效、S-NDR、浓度/电位/流动依赖。
- [Lam Research，Tech Brief: Elements of Electroplating](https://newsroom.lamresearch.com/Tech-Brief-Elements-of-Electroplating)：电子参与还原，液体成分、流动和温度影响沉积。
- [NIST Chemistry WebBook，Copper](https://webbook.nist.gov/cgi/cbook.cgi?Name=Copper)：摩尔质量。
- [NIST，Composition of COPPER](https://physics.nist.gov/cgi-bin/Star/compos.pl?matno=029&mode=text)：密度。

## 验证范围

公式与状态检查验证单位换算、法拉第总量和累计历史。本次还完成最终 HTML 上的 32 项整体交互检查、10 项首页检查、四轮结构和布局复核，以及 48 秒影片的帧数、时长、完整解码、异常粉色帧和九个关键帧的检查。结果分别保存在 `checks/v2-interaction-results.json`、`checks/hub-results.json`、`out/v2-review-report.json` 和 `out/video-validation.json`。这些是本地软件与媒体产物的验证，组件、截图或公式通过不能用来推断工艺性能。

此交付没有验证真实电镀腔、药液、局部电流分布、晶圆均匀性、填孔质量、硬件、机器人运行或生产过程。
