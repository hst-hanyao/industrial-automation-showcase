export type ArchitectureView = 'architecture' | 'walkthrough' | 'exchanges' | 'operations' | 'framework'

export function mountArchitecture(root: HTMLElement, options?: { maintenance?: boolean }): {
  setView(view: ArchitectureView): void
  destroy(): void
}
