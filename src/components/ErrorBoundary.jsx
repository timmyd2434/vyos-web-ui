import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary component to catch and handle errors gracefully
 * Prevents entire app from crashing when a component errors
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('Component Error Boundary caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                    <div className="max-w-md w-full">
                        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-6 space-y-4">
                            {/* Error Icon and Title */}
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Something went wrong</h3>
                            </div>

                            {/* Error Message */}
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                                <p className="text-sm text-red-300 font-mono">
                                    {this.state.error?.message || 'An unexpected error occurred'}
                                </p>
                            </div>

                            {/* Error Details (Dev Mode) */}
                            {this.state.errorInfo && process.env.NODE_ENV === 'development' && (
                                <details className="text-xs text-slate-500">
                                    <summary className="cursor-pointer hover:text-slate-400 mb-2">
                                        Show technical details
                                    </summary>
                                    <div className="bg-slate-950 border border-slate-800 rounded p-3 font-mono overflow-auto max-h-48">
                                        {this.state.errorInfo.componentStack}
                                    </div>
                                </details>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                                >
                                    Go to Dashboard
                                </button>
                            </div>

                            {/* Help Text */}
                            <p className="text-xs text-slate-600 text-center">
                                If this error persists, try refreshing the page or contact support.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
