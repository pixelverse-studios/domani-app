import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { LayoutPickerModal } from '../LayoutPickerModal'
import { useLayoutStore } from '~/stores/layoutStore'

describe('LayoutPickerModal', () => {
  beforeEach(() => {
    useLayoutStore.setState({ taskLayout: 'default' })
  })

  it('updates the selected task layout and closes the modal', () => {
    const onClose = jest.fn()

    renderWithProviders(<LayoutPickerModal visible onClose={onClose} />)

    fireEvent.press(screen.getByText('Compact'))

    expect(useLayoutStore.getState().taskLayout).toBe('compact')
    expect(onClose).toHaveBeenCalled()
  })
})
