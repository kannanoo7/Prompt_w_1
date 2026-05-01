import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timeline from './Timeline';

describe('Timeline Component', () => {
  it('renders the Election Timeline heading', () => {
    render(<Timeline />);
    expect(screen.getByText(/election timeline/i)).toBeInTheDocument();
  });

  it('renders the General Elections 2024 subtitle', () => {
    render(<Timeline />);
    expect(screen.getByText(/general elections 2024/i)).toBeInTheDocument();
  });

  it('renders all election phase titles', () => {
    render(<Timeline />);
    expect(screen.getByText('Phase 1 Voting')).toBeInTheDocument();
    expect(screen.getByText('Phase 2 Voting')).toBeInTheDocument();
    expect(screen.getByText('Counting Day')).toBeInTheDocument();
  });

  it('renders phase dates', () => {
    render(<Timeline />);
    expect(screen.getByText('April 19, 2024')).toBeInTheDocument();
    expect(screen.getByText('April 26, 2024')).toBeInTheDocument();
    expect(screen.getByText('June 4, 2024')).toBeInTheDocument();
  });

  it('renders Google Calendar sync links for each phase', () => {
    render(<Timeline />);
    const calendarLinks = screen.getAllByRole('link', { name: /sync.*google calendar/i });
    expect(calendarLinks).toHaveLength(3);
  });

  it('calendar links open in a new tab with noopener noreferrer', () => {
    render(<Timeline />);
    const links = screen.getAllByRole('link', { name: /sync.*google calendar/i });
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('calendar links point to Google Calendar', () => {
    render(<Timeline />);
    const links = screen.getAllByRole('link', { name: /sync.*google calendar/i });
    links.forEach((link) => {
      expect(link.href).toContain('calendar.google.com');
    });
  });
});
