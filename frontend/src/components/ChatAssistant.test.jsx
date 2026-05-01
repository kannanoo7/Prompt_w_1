import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Firebase to avoid real network calls during tests
vi.mock('../firebase', () => ({
  db: {},
}));

// Mock all Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, forEach: vi.fn() })),
  query: vi.fn(),
  orderBy: vi.fn(),
  limitToLast: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
}));

import ChatAssistant from './ChatAssistant';

describe('ChatAssistant Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test for a clean session
    localStorage.clear();
  });

  it('renders the chat input field', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByLabelText(/chat input/i)).toBeInTheDocument();
  });

  it('renders the send button', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('renders all quick prompt buttons', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByText('What is NOTA?')).toBeInTheDocument();
    expect(await screen.findByText('How does EVM work?')).toBeInTheDocument();
    expect(await screen.findByText('Am I eligible to vote?')).toBeInTheDocument();
    expect(await screen.findByText('What ID do I need to vote?')).toBeInTheDocument();
  });

  it('renders the New Session button', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByText(/new session/i)).toBeInTheDocument();
  });

  it('renders the Past Sessions sidebar heading', async () => {
    render(<ChatAssistant language="en" />);
    expect(await screen.findByText(/past sessions/i)).toBeInTheDocument();
  });

  it('renders the chat messages region with aria-live attribute', async () => {
    render(<ChatAssistant language="en" />);
    const liveRegion = await screen.findByRole('log');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
