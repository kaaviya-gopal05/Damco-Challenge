import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors anywhere below it so a single broken component shows a
 * readable fallback instead of a blank white screen. React error boundaries must
 * be class components — there is no hook equivalent (componentDidCatch has no
 * useEffect analog for render-phase errors).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-ink-900">Something went wrong</p>
            <p className="mt-1 text-sm text-ink-500">
              An unexpected error occurred. Reloading the page usually fixes this.
            </p>
          </div>
          <Button onClick={this.handleReload}>Reload the page</Button>
        </div>
      </div>
    );
  }
}
