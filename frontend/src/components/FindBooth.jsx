import React, { useState } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';

export default function FindBooth() {
  const [location, setLocation] = useState('');
  const [origin, setOrigin] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (location.trim().length >= 3) {
      setOrigin(location);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude},${position.coords.longitude}`;
        setLocation("My Location");
        setOrigin(coords);
        setLoadingLoc(false);
      },
      () => {
        alert("Unable to retrieve your location");
        setLoadingLoc(false);
      }
    );
  };

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', marginTop: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
        <MapPin size={24} />
        Find Your Voting Booth Directions
      </h2>
      <p style={{ marginBottom: '1rem', color: '#555' }}>
        Enter your location or use your device's GPS to get directions to the nearest polling station.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={handleCurrentLocation} 
          disabled={loadingLoc}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#34d399' }}
        >
          <Navigation size={18} />
          {loadingLoc ? 'Finding...' : 'Use Current Location'}
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Or enter your starting location..."
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
          required
        />
        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} />
          Get Directions
        </button>
      </form>

      {origin && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee' }}>
          <iframe
            width="100%"
            height="400"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(origin)}&destination=polling+booth+near+${encodeURIComponent(origin)}`}
          ></iframe>
        </div>
      )}
    </div>
  );
}
