import { lazy, Suspense, useEffect, useState } from 'react';
import { Check, Globe, Type } from 'lucide-react';
import './App.css';

const ChatAssistant = lazy(() => import('./components/ChatAssistant'));
const Timeline = lazy(() => import('./components/Timeline'));
const FindBooth = lazy(() => import('./components/FindBooth'));

function LoadingPanel() {
  return (
    <div role="status" aria-live="polite" style={{ padding: '1rem' }}>
      Loading...
    </div>
  );
}

function App() {
  const [simpleLanguage, setSimpleLanguage] = useState(false);
  const [language, setLanguage] = useState('en');
  const [activeWidget, setActiveWidget] = useState('chat');

  useEffect(() => {
    if (simpleLanguage) {
      document.body.setAttribute('data-simple-language', 'true');
    } else {
      document.body.removeAttribute('data-simple-language');
    }
  }, [simpleLanguage]);

  useEffect(() => {
    const translateCombo = document.querySelector('.goog-te-combo');
    if (translateCombo) {
      translateCombo.value = language;
      translateCombo.dispatchEvent(new Event('change'));
    }
  }, [language]);

  return (
    <div className="app-container">
      <div className="accessibility-bar">
        <button
          className={`accessibility-btn ${simpleLanguage ? 'active' : ''}`}
          onClick={() => setSimpleLanguage(!simpleLanguage)}
          aria-pressed={simpleLanguage}
          title="Toggle Simple Language and larger text for better readability"
        >
          <Type size={16} />
          Simple Language Mode {simpleLanguage && <Check size={14} />}
        </button>

        <div className="language-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <Globe size={16} />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
            aria-label="Select Language"
          >
            <option value="en" style={{ color: '#000' }}>English</option>
            <option value="hi" style={{ color: '#000' }}>Hindi</option>
            <option value="ta" style={{ color: '#000' }}>Tamil</option>
            <option value="te" style={{ color: '#000' }}>Telugu</option>
            <option value="bn" style={{ color: '#000' }}>Bengali</option>
          </select>
        </div>
      </div>

      <header>
        <h1>Smart Election Assistant</h1>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>Your guide to the election process, voting steps, and key dates.</p>

        <div
          role="tablist"
          aria-label="Main navigation"
          style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}
        >
          <button
            role="tab"
            aria-selected={activeWidget === 'chat'}
            aria-controls="panel-chat"
            id="tab-chat"
            className={`btn-primary ${activeWidget === 'chat' ? 'active-tab' : 'inactive-tab'}`}
            style={{ opacity: activeWidget === 'chat' ? 1 : 0.7 }}
            onClick={() => setActiveWidget('chat')}
          >
            Chat Assistant
          </button>
          <button
            role="tab"
            aria-selected={activeWidget === 'booth'}
            aria-controls="panel-booth"
            id="tab-booth"
            className={`btn-primary ${activeWidget === 'booth' ? 'active-tab' : 'inactive-tab'}`}
            style={{ opacity: activeWidget === 'booth' ? 1 : 0.7 }}
            onClick={() => setActiveWidget('booth')}
          >
            Find Booth
          </button>
          <button
            role="tab"
            aria-selected={activeWidget === 'timeline'}
            aria-controls="panel-timeline"
            id="tab-timeline"
            className={`btn-primary ${activeWidget === 'timeline' ? 'active-tab' : 'inactive-tab'}`}
            style={{ opacity: activeWidget === 'timeline' ? 1 : 0.7 }}
            onClick={() => setActiveWidget('timeline')}
          >
            Timeline
          </button>
        </div>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<LoadingPanel />}>
          {activeWidget === 'chat' && (
            <div
              id="panel-chat"
              role="tabpanel"
              aria-labelledby="tab-chat"
              style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
            >
              <ChatAssistant language={language} />
            </div>
          )}
          {activeWidget === 'booth' && (
            <div
              id="panel-booth"
              role="tabpanel"
              aria-labelledby="tab-booth"
            >
              <FindBooth />
            </div>
          )}
          {activeWidget === 'timeline' && (
            <div
              id="panel-timeline"
              role="tabpanel"
              aria-labelledby="tab-timeline"
            >
              <Timeline />
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
