import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState('loading');

  useEffect(() => {
    fetch('http://127.0.0.1:8080/api/health')
      .then((response) => response.json())
      .then((payload) => setHealth(payload.status ?? 'unknown'))
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <main className="app">
      <section className="card">
        <p className="badge">Frontend React</p>
        <h1>Let Note Example App</h1>
        <p>
          Ceci est une application d'exemple: le frontend React appelle un
          backend Rust local.
        </p>
        <p>
          Etat du backend: <strong>{health}</strong>
        </p>
      </section>
    </main>
  );
}
