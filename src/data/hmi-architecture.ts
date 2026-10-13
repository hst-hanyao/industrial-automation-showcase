import sourceSnippets from './hmi-source-snippets.json'

export interface HmiLayer {
  readonly id: string
  readonly label: string
  readonly caption: string
  readonly representativeNodeIds: readonly string[]
}

export interface HmiNode {
  readonly id: string
  readonly label: string
  readonly roleTitle: string
  readonly description: string
  readonly layerId: string
  readonly kind: 'code' | 'external'
  readonly snippetIds: readonly string[]
  readonly defaultSnippetId?: string
}

export interface HmiCodeSnippet {
  readonly id: string
  readonly file: string
  readonly symbol: string
  readonly language: 'csharp' | 'xml'
  readonly startLine: number
  readonly lines: readonly string[]
}

export interface HmiEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: 'call' | 'projection' | 'binding' | 'implementation'
  readonly evidenceSnippetId: string
}

export interface HmiCallChain {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly defaultSnippetByNode: Readonly<Record<string, string>>
}

export const hmiSourceSnapshot = {
  project: 'WaferElectroplatingMachine',
  capturedAt: '2026-10-04',
  revision: 'd4349bbccffce50577e07098ba916c755859f820',
  note: '当前工作区源码摘录；revision 为读取时的 HEAD，摘录可包含工作区变化。片段保留源文件相对路径和原始行号，仅代表静态源码关系。',
  verification: '所有片段均按原始行号逐行核对；未运行 WPF、未连接 PLC 或数据库。',
} as const

export const hmiCodeSnippets: readonly HmiCodeSnippet[] = sourceSnippets.map((snippet) => ({
  ...snippet,
  language: snippet.language === 'xml' ? 'xml' : 'csharp',
}))

export const hmiLayers: readonly HmiLayer[] = [
  { id: 'entry', label: '应用入口', caption: '启动、主窗口与运行上下文', representativeNodeIds: ['main-window'] },
  { id: 'views', label: '页面与交互', caption: 'XAML 绑定 · Click 事件薄转发', representativeNodeIds: ['recipe-view'] },
  { id: 'viewmodels', label: '页面状态与协调', caption: '壳层轮询、设备操作与业务方法', representativeNodeIds: ['shell'] },
  { id: 'services', label: '业务服务', caption: '启动初始化与业务边界', representativeNodeIds: ['startup-service'] },
  { id: 'data', label: '通讯与持久化', caption: 'ADS / SQLite / SQL Server', representativeNodeIds: ['ads-client'] },
  { id: 'projection', label: '投影与呈现', caption: '快照模型与可复用工业控件', representativeNodeIds: ['ui-snapshot'] },
]

export const hmiNodes: readonly HmiNode[] = [
  { id: 'app', label: 'App', roleTitle: '应用启动', description: '初始化本地结构后创建并显示主窗口。', layerId: 'entry', kind: 'code', snippetIds: ['app-startup'], defaultSnippetId: 'app-startup' },
  { id: 'main-window', label: 'MainWindow', roleTitle: '主窗口与状态栏', description: '设置 ShellViewModel，显示通讯与设备状态。', layerId: 'entry', kind: 'code', snippetIds: ['window-init', 'window-binding'], defaultSnippetId: 'window-init' },
  { id: 'manual-view', label: 'PltManualIoView', roleTitle: '手动操作入口', description: '解析按钮参数，将手动输出动作转发给 ViewModel。', layerId: 'views', kind: 'code', snippetIds: ['manual-click', 'manual-binding'], defaultSnippetId: 'manual-click' },
  { id: 'recipe-view', label: 'RecipeView', roleTitle: '配方操作入口', description: '配方保存按钮通过 Click 事件进入业务方法。', layerId: 'views', kind: 'code', snippetIds: ['recipe-click'], defaultSnippetId: 'recipe-click' },
  { id: 'history-view', label: 'HistoryView', roleTitle: '历史曲线页面', description: '加载选定记录，取消过期请求，并把快照交给趋势控件。', layerId: 'views', kind: 'code', snippetIds: ['history-click', 'history-display'], defaultSnippetId: 'history-display' },
  { id: 'shell', label: 'ShellViewModel', roleTitle: '轮询与运行协调', description: '持有页面状态、PLC 客户端及 100 ms 读取计时器。', layerId: 'viewmodels', kind: 'code', snippetIds: ['shell-composition', 'shell-timer', 'shell-read', 'shell-ui'], defaultSnippetId: 'shell-read' },
  { id: 'manual-vm', label: 'PltR1ManualViewModel', roleTitle: '手动请求与权限状态', description: '经 IPlcClient 发出请求；读回状态独立刷新写权限与绑定。', layerId: 'viewmodels', kind: 'code', snippetIds: ['manual-write', 'manual-update'], defaultSnippetId: 'manual-write' },
  { id: 'recipe-vm', label: 'Stage4DataViewModel', roleTitle: '配方业务与审计', description: '保存前授权，保存后审计并重新加载配方。', layerId: 'viewmodels', kind: 'code', snippetIds: ['recipe-save'], defaultSnippetId: 'recipe-save' },
  { id: 'history-vm', label: 'HistoryViewModel', roleTitle: '查询取消与结果保护', description: '可取消读取四通道数据，只有最新请求能够返回有效结果。', layerId: 'viewmodels', kind: 'code', snippetIds: ['history-query', 'history-result'], defaultSnippetId: 'history-query' },
  { id: 'startup-service', label: 'StartupDataInitializer', roleTitle: '启动数据初始化', description: '主界面显示前初始化 SQLite，SQL Server 留待后台初始化。', layerId: 'services', kind: 'code', snippetIds: ['startup-local'], defaultSnippetId: 'startup-local' },
  { id: 'plc-client', label: 'IPlcClient', roleTitle: '设备通讯接口', description: 'ViewModel 与 PLC 协议实现之间的异步接口。', layerId: 'data', kind: 'code', snippetIds: ['plc-interface'], defaultSnippetId: 'plc-interface' },
  { id: 'ads-client', label: 'AdsCommunicationClient', roleTitle: 'ADS 整包读写', description: '整包读写 GVL_ADS，检查一致性、映射快照并管理命令序号。', layerId: 'data', kind: 'code', snippetIds: ['ads-contract', 'ads-read', 'ads-coherence', 'ads-sdk-read', 'ads-map', 'ads-raw', 'ads-output', 'ads-manual', 'ads-packet'], defaultSnippetId: 'ads-read' },
  { id: 'sqlite-repo', label: 'SqliteStage4Repository', roleTitle: '配方事务持久化', description: '在事务中用参数保存配方与步骤。', layerId: 'data', kind: 'code', snippetIds: ['recipe-transaction'], defaultSnippetId: 'recipe-transaction' },
  { id: 'history-repo', label: 'SqlServerHistoryRepository', roleTitle: '历史过程值查询', description: '按运行记录号执行可取消的参数化过程值查询。', layerId: 'data', kind: 'code', snippetIds: ['history-sql'], defaultSnippetId: 'history-sql' },
  { id: 'plc', label: 'TwinCAT PLC', roleTitle: '外部控制器', description: '外部控制器：ADS 状态读回与命令整包写入的目标。', layerId: 'data', kind: 'external', snippetIds: [] },
  { id: 'sqlite', label: 'SQLite', roleTitle: '本地配方与配置库', description: '本地配方及配置数据的持久化介质。', layerId: 'data', kind: 'external', snippetIds: [] },
  { id: 'sql-server', label: 'SQL Server', roleTitle: '运行历史数据库', description: '运行、事件与历史过程值的持久化介质。', layerId: 'data', kind: 'external', snippetIds: [] },
  { id: 'raw-snapshot', label: 'PlcRawSnapshot', roleTitle: 'PLC 原始状态快照', description: '通讯层构建的连接、模式、步骤与报警原始快照。', layerId: 'projection', kind: 'code', snippetIds: ['raw-model', 'ads-raw'], defaultSnippetId: 'raw-model' },
  { id: 'ui-snapshot', label: 'UiStatusSnapshot', roleTitle: '界面显示状态', description: '壳层将原始事实映射成 UI 所需文字和状态。', layerId: 'projection', kind: 'code', snippetIds: ['ui-model', 'shell-ui'], defaultSnippetId: 'ui-model' },
  { id: 'trend-chart', label: 'TrendChartControl', roleTitle: '历史趋势呈现', description: '接收历史数据快照，以版本和取消标记控制异步呈现。', layerId: 'projection', kind: 'code', snippetIds: ['chart-load'], defaultSnippetId: 'chart-load' },
]

export const hmiEdges: readonly HmiEdge[] = [
  { id: 'app-startup', from: 'app', to: 'startup-service', kind: 'call', evidenceSnippetId: 'app-startup' },
  { id: 'app-window', from: 'app', to: 'main-window', kind: 'call', evidenceSnippetId: 'app-startup' },
  { id: 'window-shell', from: 'main-window', to: 'shell', kind: 'call', evidenceSnippetId: 'window-init' },
  { id: 'shell-manual', from: 'shell', to: 'manual-vm', kind: 'call', evidenceSnippetId: 'shell-composition' },
  { id: 'shell-recipe', from: 'shell', to: 'recipe-vm', kind: 'call', evidenceSnippetId: 'shell-composition' },
  { id: 'shell-history', from: 'shell', to: 'history-vm', kind: 'call', evidenceSnippetId: 'shell-composition' },
  { id: 'shell-read', from: 'shell', to: 'plc-client', kind: 'call', evidenceSnippetId: 'shell-read' },
  { id: 'client-ads', from: 'plc-client', to: 'ads-client', kind: 'implementation', evidenceSnippetId: 'ads-contract' },
  { id: 'ads-plc-read', from: 'ads-client', to: 'plc', kind: 'call', evidenceSnippetId: 'ads-sdk-read' },
  { id: 'ads-raw', from: 'ads-client', to: 'raw-snapshot', kind: 'projection', evidenceSnippetId: 'ads-raw' },
  { id: 'raw-shell', from: 'raw-snapshot', to: 'shell', kind: 'projection', evidenceSnippetId: 'shell-read' },
  { id: 'shell-ui', from: 'shell', to: 'ui-snapshot', kind: 'projection', evidenceSnippetId: 'shell-ui' },
  { id: 'ui-window', from: 'ui-snapshot', to: 'main-window', kind: 'binding', evidenceSnippetId: 'window-binding' },
  { id: 'shell-manual-status', from: 'shell', to: 'manual-vm', kind: 'projection', evidenceSnippetId: 'shell-read' },
  { id: 'manual-view-action', from: 'manual-view', to: 'manual-vm', kind: 'call', evidenceSnippetId: 'manual-click' },
  { id: 'manual-write', from: 'manual-vm', to: 'plc-client', kind: 'call', evidenceSnippetId: 'manual-write' },
  { id: 'ads-plc-write', from: 'ads-client', to: 'plc', kind: 'call', evidenceSnippetId: 'ads-packet' },
  { id: 'manual-view-status', from: 'manual-vm', to: 'manual-view', kind: 'binding', evidenceSnippetId: 'manual-binding' },
  { id: 'recipe-view-save', from: 'recipe-view', to: 'recipe-vm', kind: 'call', evidenceSnippetId: 'recipe-click' },
  { id: 'recipe-vm-save', from: 'recipe-vm', to: 'sqlite-repo', kind: 'call', evidenceSnippetId: 'recipe-save' },
  { id: 'sqlite-write', from: 'sqlite-repo', to: 'sqlite', kind: 'call', evidenceSnippetId: 'recipe-transaction' },
  { id: 'history-view-load', from: 'history-view', to: 'history-vm', kind: 'call', evidenceSnippetId: 'history-display' },
  { id: 'history-vm-query', from: 'history-vm', to: 'history-repo', kind: 'call', evidenceSnippetId: 'history-query' },
  { id: 'history-db-read', from: 'history-repo', to: 'sql-server', kind: 'call', evidenceSnippetId: 'history-sql' },
  { id: 'history-view-result', from: 'history-vm', to: 'history-view', kind: 'projection', evidenceSnippetId: 'history-display' },
  { id: 'history-chart', from: 'history-view', to: 'trend-chart', kind: 'call', evidenceSnippetId: 'history-display' },
]

// nodeIds are unique reading-order nodes; edgeIds describe the associated subgraph,
// including returned projections and bindings rather than implying a linear stack.
export const hmiCallChains: readonly HmiCallChain[] = [
  { id: 'status', label: '状态读取', description: '100 ms 轮询 → ADS 一致快照 → 原始状态 → UI 投影与绑定。', nodeIds: ['shell', 'plc-client', 'ads-client', 'plc', 'raw-snapshot', 'ui-snapshot', 'main-window'], edgeIds: ['shell-read', 'client-ads', 'ads-plc-read', 'ads-raw', 'raw-shell', 'shell-ui', 'ui-window'], defaultSnippetByNode: { shell: 'shell-read', 'plc-client': 'plc-interface', 'ads-client': 'ads-read', 'raw-snapshot': 'ads-raw', 'ui-snapshot': 'shell-ui', 'main-window': 'window-binding' } },
  { id: 'manual', label: '手动写入', description: 'Click → 输出请求 → 带序号的 ADS 命令包；执行结果通过状态读取链返回。', nodeIds: ['manual-view', 'manual-vm', 'plc-client', 'ads-client', 'plc'], edgeIds: ['manual-view-action', 'manual-write', 'client-ads', 'ads-plc-write', 'manual-view-status'], defaultSnippetByNode: { 'manual-view': 'manual-click', 'manual-vm': 'manual-write', 'plc-client': 'plc-interface', 'ads-client': 'ads-manual' } },
  { id: 'recipe', label: '配方保存', description: 'Click → 授权与审计 → SQLite 事务保存配方与步骤。', nodeIds: ['recipe-view', 'recipe-vm', 'sqlite-repo', 'sqlite'], edgeIds: ['recipe-view-save', 'recipe-vm-save', 'sqlite-write'], defaultSnippetByNode: { 'recipe-view': 'recipe-click', 'recipe-vm': 'recipe-save', 'sqlite-repo': 'recipe-transaction' } },
  { id: 'history', label: '历史曲线', description: '选定运行记录 → 可取消 SQL 查询 → 最新结果 → 趋势快照呈现。', nodeIds: ['history-view', 'history-vm', 'history-repo', 'sql-server', 'trend-chart'], edgeIds: ['history-view-load', 'history-vm-query', 'history-db-read', 'history-view-result', 'history-chart'], defaultSnippetByNode: { 'history-view': 'history-display', 'history-vm': 'history-query', 'history-repo': 'history-sql', 'trend-chart': 'chart-load' } },
]
