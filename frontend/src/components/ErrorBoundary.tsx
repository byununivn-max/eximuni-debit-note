import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** 런타임 에러 발생 시 앱 크래시 방지, 복구 UI 표시 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="오류가 발생했습니다"
          subTitle={this.state.error?.message || '알 수 없는 오류'}
          extra={[
            <Button key="retry" type="primary" onClick={this.handleReset}>
              다시 시도
            </Button>,
            <Button key="home" onClick={() => window.location.href = '/'}>
              홈으로
            </Button>,
          ]}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
