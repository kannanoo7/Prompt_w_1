import React from 'react';
import { Calendar, CalendarPlus, CheckCircle2 } from 'lucide-react';
import './Timeline.css';

const phases = [
  {
    id: 1,
    date: 'April 19, 2024',
    title: 'Phase 1 Voting',
    description: 'Voting in 102 constituencies across 21 states and UTs.',
    calendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Election+Phase+1+Voting&dates=20240419T023000Z/20240419T123000Z&details=Go+vote+in+Phase+1!&location=Your+Polling+Booth'
  },
  {
    id: 2,
    date: 'April 26, 2024',
    title: 'Phase 2 Voting',
    description: 'Voting in 89 constituencies across 13 states and UTs.',
    calendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Election+Phase+2+Voting&dates=20240426T023000Z/20240426T123000Z&details=Go+vote+in+Phase+2!&location=Your+Polling+Booth'
  },
  {
    id: 3,
    date: 'June 4, 2024',
    title: 'Counting Day',
    description: 'Votes will be counted and results will be declared.',
    calendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Election+Results+Day&dates=20240604T023000Z/20240604T123000Z&details=Election+Results+Declaration'
  }
];

function Timeline() {
  return (
    <div className="timeline-container glass">
      <div className="timeline-header">
        <h2>
          <Calendar size={24} /> Election Timeline
        </h2>
        <p className="timeline-header-subtitle">General Elections 2024</p>
      </div>
      
      <div className="timeline-events">
        {phases.map((phase) => (
          <div key={phase.id} className="timeline-event">
            <div className="event-icon">
              <CheckCircle2 size={16} color="var(--primary)" />
            </div>
            <div className="event-content">
              <div className="event-date">{phase.date}</div>
              <div className="event-title">{phase.title}</div>
              <p className="event-description">{phase.description}</p>
              
              <a 
                href={phase.calendarLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="calendar-link"
                aria-label={`Sync ${phase.title} to Google Calendar`}
              >
                <CalendarPlus size={16} /> Sync with Google Calendar
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(Timeline);
