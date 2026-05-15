import React from 'react'
import { render, screen } from '@testing-library/react-native'

import { Text } from '../Text'

describe('Text', () => {
  it('renders a React Native component imported from src', () => {
    render(<Text>Domani test foundation</Text>)

    expect(screen.getByText('Domani test foundation')).toBeTruthy()
  })
})
