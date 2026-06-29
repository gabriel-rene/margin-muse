import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditorToolbar from '@/components/EditorToolbar'

describe('EditorToolbar', () => {
  it('is collapsed by default and opens from the toggle', () => {
    render(
      <EditorToolbar
        editor={null}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
      />
    )
    expect(screen.queryByLabelText('Bold')).toBeNull()
    fireEvent.click(screen.getByLabelText('Show formatting toolbar'))
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
  })

  it('runs undo and redo callbacks', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    render(<EditorToolbar editor={null} canUndo canRedo onUndo={onUndo} onRedo={onRedo} />)
    fireEvent.click(screen.getByLabelText('Show formatting toolbar'))
    fireEvent.click(screen.getByLabelText('Undo'))
    fireEvent.click(screen.getByLabelText('Redo'))
    expect(onUndo).toHaveBeenCalled()
    expect(onRedo).toHaveBeenCalled()
  })
})
