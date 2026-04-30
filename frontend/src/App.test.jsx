import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock child components to isolate App.jsx tests
vi.mock('./components/ChatAssistant', () => ({
  default: () => <div data-testid="chat-assistant">Chat Assistant</div>,
}));
vi.mock('./components/FindBooth', () => ({
  default: () => <div data-testid="find-booth">Find Booth</div>,
}));
vi.mock('./components/Timeline', () => ({
  default: () => <div data-testid="timeline">Timeline</div>,
}));

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Smart Election Assistant')).toBeInTheDocument();
  });

  it('renders all three navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /chat assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /find booth/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument();
  });

  it('shows ChatAssistant by default', () => {
    render(<App />);
    expect(screen.getByTestId('chat-assistant')).toBeInTheDocument();
    expect(screen.queryByTestId('find-booth')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  it('switches to Find Booth tab when clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /find booth/i }));
    expect(screen.getByTestId('find-booth')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();
  });

  it('switches to Timeline tab when clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /timeline/i }));
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();
  });

  it('renders the Simple Language mode toggle button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /simple language/i })).toBeInTheDocument();
  });

  it('renders the language selector dropdown', () => {
    render(<App />);
    expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
  });
});
