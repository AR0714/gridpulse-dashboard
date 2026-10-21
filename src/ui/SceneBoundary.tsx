import { Component, type ReactNode } from 'react'

/**
 * If the 3D scene can't load (chunk failed, no WebGL, driver error), keep the dashboard
 * working on the static backdrop instead of unmounting the whole page.
 */
export default class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('3D scene unavailable, showing the static backdrop instead:', error)
  }

  render() {
    return this.state.failed ? <div className="scene-fallback absolute inset-0" aria-hidden="true" /> : this.props.children
  }
}
