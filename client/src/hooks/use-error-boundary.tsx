import { Component, ErrorInfo, ReactNode } from 'react';
import { useToast } from './use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function useErrorHandler() {
  const { toast } = useToast();

  return (error: Error) => {
    console.error(error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message
    });
  };
}
