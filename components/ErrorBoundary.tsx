
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.name || 'Unknown'}]`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-black/80 border-2 border-red-500/30 rounded-[2rem] backdrop-blur-xl text-center space-y-4 m-4">
          <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
          <h2 className="text-xl font-serif font-black text-white uppercase tracking-tighter">
            Matrix Corruption: {this.props.name || 'Component'}
          </h2>
          <p className="text-xs text-gray-500 font-mono max-w-xs overflow-hidden text-ellipsis">
            {this.state.error?.message || 'An unexpected axiomatic failure occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            Re-Stabilize Matrix
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
