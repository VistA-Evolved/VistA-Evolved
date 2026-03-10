'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

/* ================================================================== */
/* Error Boundary -- Phase 15E                                          */
/*                                                                     */
/* Catches render errors in child components and shows a recovery UI   */
/* instead of white-screening the entire app.                          */
/* ================================================================== */

interface Props {
  children: ReactNode;
  /** Optional fallback UI when an error occurs */
  fallback?: ReactNode;
  /** Panel/section name for error reporting */
  name?: string;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.name ? ` -- ${this.props.name}` : ''}]`,
      error,
      errorInfo
    );
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '16px',
            margin: '8px',
            border: '1px solid #dc3545',
            borderRadius: '4px',
            backgroundColor: '#fff5f5',
            color: '#333',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#dc3545' }}>
            {this.props.name ? `Error in ${this.props.name}` : 'Something went wrong'}
          </div>
          <div style={{ marginBottom: '12px', color: '#666' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 16px',
              border: '1px solid #dc3545',
              borderRadius: '3px',
              backgroundColor: 'white',
              color: '#dc3545',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ================================================================== */
/* Loading skeleton -- Phase 15E                                        */
/* ================================================================== */

interface LoadingPanelProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Optional label */
  label?: string;
}

export function LoadingPanel({ rows = 4, label }: LoadingPanelProps): ReactNode {
  return (
    <div
      style={{
        padding: '12px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#888',
      }}
    >
      {label && <div style={{ marginBottom: '8px' }}>{label}</div>}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            height: '14px',
            margin: '6px 0',
            borderRadius: '3px',
            backgroundColor: '#e9ecef',
            width: `${70 + Math.random() * 30}%`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/* Empty state placeholder                                             */
/* ================================================================== */

interface EmptyStateProps {
  message?: string;
  icon?: string;
}

export function EmptyState({
  message = 'No data available',
  icon = '📋',
}: EmptyStateProps): ReactNode {
  return (
    <div
      style={{
        padding: '24px',
        textAlign: 'center',
        color: '#999',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div>{message}</div>
    </div>
  );
}
