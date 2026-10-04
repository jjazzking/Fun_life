import { useEffect, useState } from 'react';
import { CardEditorPage } from './pages/CardEditorPage';
import { CardListPage } from './pages/CardListPage';
import { SchemaPage } from './pages/SchemaPage';
import { IntroOverlay } from './intro/IntroOverlay';
import { parseHash, type Route } from './router';

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <>
      {route.name === 'card' ? (
        <CardEditorPage key={route.id} cardId={route.id} />
      ) : route.name === 'schema' ? (
        <SchemaPage />
      ) : (
        <CardListPage />
      )}
      <IntroOverlay />
    </>
  );
}
