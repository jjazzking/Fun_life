import { useEffect, useState } from 'react';
import { CardEditorPage } from './pages/CardEditorPage';
import { CardListPage } from './pages/CardListPage';
import { SchemaPage } from './pages/SchemaPage';
import { parseHash, type Route } from './router';

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (route.name === 'card') return <CardEditorPage key={route.id} cardId={route.id} />;
  if (route.name === 'schema') return <SchemaPage />;
  return <CardListPage />;
}
