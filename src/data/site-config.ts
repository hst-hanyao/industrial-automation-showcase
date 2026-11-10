/**
 * 站点级常量的单一来源：名称、简介、备案信息与页头展示常量。
 * HTML 入口文件（index.html、capability-map/index.html）中的同类信息单独维护，
 * 不在此文件范围内。
 */

/** 站点名，同时作为各页面文档标题的后缀。 */
export const SITE_NAME = '工业自动化能力图谱'

/** 站点简介，与入口 HTML 的 meta description 保持一致。 */
export const SITE_DESCRIPTION = '工业自动化能力展示站：上位机、PLC 官方案例复盘、运动控制与机器视觉。'

/** ICP 备案号及工信部备案查询地址。 */
export const ICP_FILING_NUMBER = '浙ICP备2026082555号-1'
export const ICP_QUERY_URL = 'https://beian.miit.gov.cn/'

/** 公安备案号、查询地址与备案图标文件名。 */
export const PUBLIC_SECURITY_FILING_NUMBER = '浙公网安备33020002001289号'
export const PUBLIC_SECURITY_QUERY_URL = 'https://beian.mps.gov.cn/#/query/webSearch?code=33020002001289'
export const PUBLIC_SECURITY_FILING_ICON = 'public-security-filing.png'

/** 页头「问题排查」导航项的主题色。 */
export const CASES_NAV_ACCENT = '#16a34a'

/** 「3 分钟精选导览」入口的可见文案与提示。 */
export const QUICK_TOUR_TITLE = '打开 3 分钟精选导览'
export const QUICK_TOUR_LABEL = '3分钟速览'
