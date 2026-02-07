import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { AlertTriangle, RotateCcw } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { captureException } from '~/lib/sentry'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', info.componentStack)
    }

    // Report to Sentry with component stack context
    captureException(error, {
      componentStack: info.componentStack,
      errorBoundary: true,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: '#FAF8F5' }}>
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-6">
            <AlertTriangle size={32} color="#ef4444" />
          </View>

          <Text className="text-xl font-semibold mb-2 text-center" style={{ color: '#3D4A44' }}>
            Something went wrong
          </Text>

          <Text className="text-base text-center mb-8" style={{ color: '#6B7265' }}>
            We're sorry, an unexpected error occurred. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View className="rounded-xl p-4 mb-6 w-full" style={{ backgroundColor: '#F5F2ED' }}>
              <Text className="text-sm font-medium text-red-600 mb-1">
                {this.state.error.name}
              </Text>
              <Text className="text-xs" style={{ color: '#6B7265' }}>
                {this.state.error.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={this.handleRetry}
            activeOpacity={0.8}
            className="px-6 py-3 rounded-xl flex-row items-center"
            style={{ backgroundColor: '#7D9B8A' }}
          >
            <RotateCcw size={18} color="#ffffff" />
            <Text className="text-white font-semibold ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}
