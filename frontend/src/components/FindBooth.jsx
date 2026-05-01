import React, { useState, useMemo } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';
import './FindBooth.css';

function FindBooth() {
  const [location, setLocation] = useState('');
  const [origin, setOrigin] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    if (location.trim().length >= 3) {
      setOrigin(location.trim());
    } else {
      setError('Please enter at least 3 characters for your location.');
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude},${position.coords.longitude}`;
        setLocation('My Location');
        setOrigin(coords);
        setLoadingLoc(false);
      },
      () => {
        setError('Unable to retrieve your location. Please enter it manually.');
        setLoadingLoc(false);
      }
    );
  };

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mapSrc = useMemo(() => {
    if (!origin || !mapsApiKey) return null;
    return `https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(origin)}&destination=polling+booth+near+${encodeURIComponent(origin)}`;
  }, [origin, mapsApiKey]);

  return (
    <div className="booth-container glass">
      <h2 className="booth-title">
        <MapPin size={24} />
        Find Your Voting Booth Directions
      </h2>
      <p className="booth-description">
        Enter your location or use your device's GPS to get directions to the nearest polling station.
      </p>

      <div className="booth-actions">
        <button
          onClick={handleCurrentLocation}
          disabled={loadingLoc}
          className="btn-primary btn-gps"
          aria-label="Use my current GPS location"
        >
          <Navigation size={18} />
          {loadingLoc ? 'Finding...' : 'Use Current Location'}
        </button>
      </div>

      {error && (
        <p role="alert" className="error-msg">
          {error}
        </p>
      )}

      <form onSubmit={handleSearch} className="booth-form">
        <input
          type="text"
          className="booth-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Or enter your starting location..."
          aria-label="Enter your starting location"
          required
          minLength={3}
        />
        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} />
          Get Directions
        </button>
      </form>

      {mapSrc && (
        <div className="map-wrapper">
          <iframe
            title="Polling booth directions map"
            width="100%"
            height="400"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapSrc}
          />
        </div>
      )}
    </div>
  );
}

export default React.memo(FindBooth);
