export type ArchitectureView = 'architecture' | 'walkthrough' | 'exchanges' | 'operations' | 'framework'

export function mountArchitecture(root: HTMLElement): {
  setView(view: ArchitectureView): void
  destroy(): void
}
