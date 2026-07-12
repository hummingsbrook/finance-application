import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-edge-padding-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-8 max-w-md w-full text-center card-shadow border border-outline-variant">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 48 }}>error</span>
            <h1 className="font-headline-lg text-on-surface mt-4">Something went wrong</h1>
            <p className="text-body-sm text-on-surface-variant mt-2">
              An unexpected error occurred. Please try again or contact your administrator.
            </p>
            <button
              onClick={this.handleReset}
              className="mt-6 px-6 py-3 bg-primary-container text-on-primary-container font-label-md rounded-full hover:opacity-90 transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Apply persisted theme before first render to avoid flash
(function () {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);