/**
 * 隐式 URL 参数登记表。
 *
 * 这些参数由各静态页面直接读取 location.search，不经过 React Router 状态。
 * 这里集中登记键名、用途与合法取值，并提供白名单判断，避免把任意查询串
 * 当成功能开关。
 */

export interface UrlParamDefinition {
  /** 参数用途说明。 */
  readonly description: string
  /** 允许的取值；isFlag 为 true 时不校验取值，只看键是否出现。 */
  readonly values: readonly string[]
  /** 缺省时的等效取值（仅用于说明，运行时不自动补齐）。 */
  readonly defaultValue?: string
  /** 是否为「仅判断存在」的开关参数。 */
  readonly isFlag?: boolean
}

export const urlParamDefinitions = {
  edit: {
    description: 'PLC 程序架构页的维护模式；等于 1 时启用浏览器草稿编辑入口。',
    values: ['1'],
    defaultValue: '0',
  },
  view: {
    description: 'PLC 程序架构页的说明视图；旧入口 /plc-architecture/?view=… 与 /packml/ 也会写入。',
    values: ['architecture', 'walkthrough', 'exchanges', 'operations', 'framework', 'packml'],
    defaultValue: 'architecture',
  },
  motion: {
    description: '显式动效覆盖；full 强制完整动效，reduced 强制降低动效，不改写系统无障碍偏好。',
    values: ['full', 'reduced'],
  },
  film: {
    description: '拉伸弯曲工作台的电影模式开关；仅判断参数是否出现（?film），不校验取值。',
    values: [''],
    isFlag: true,
  },
  pattern: {
    description: '晶圆电镀教学工作台的生长工艺族；tsv 为默认，wlp 切换为 WLP 步骤组。',
    values: ['tsv', 'wlp'],
    defaultValue: 'tsv',
  },
  teaching: {
    description: '教学模型页的嵌入模式标记；等于 1 时按被工作台嵌入的方式加载。',
    values: ['1'],
  },
} as const satisfies Record<string, UrlParamDefinition>

export type UrlParamKey = keyof typeof urlParamDefinitions

export function isKnownUrlParam(key: string): key is UrlParamKey {
  return Object.prototype.hasOwnProperty.call(urlParamDefinitions, key)
}

/**
 * 判断 (参数名, 取值) 是否属于登记的白名单。
 * 未知参数名与非白名单取值均返回 false；开关类参数忽略取值。
 */
export function isAllowedUrlParamValue(key: string, value: string): boolean {
  if (!isKnownUrlParam(key)) return false
  const definition: UrlParamDefinition = urlParamDefinitions[key]
  if (definition.isFlag) return true
  return definition.values.includes(value)
}
