import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [health, setHealth] = useState('loading');

  const loadHealth = () => {
    setHealth('loading');
    fetch('http://127.0.0.1:8080/api/health')
      .then((response) => response.json())
      .then((payload) => setHealth(payload.status ?? 'unknown'))
      .catch(() => setHealth('unreachable'));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-10 grid place-items-center">
      <section className="w-full max-w-xl rounded-lg border border-border bg-card p-6 md:p-8 shadow-[0_24px_80px_rgba(196,106,22,0.16)]">
        <p className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          Frontend React + Tailwind + shadcn
        </p>
        <h1 className="m-0 text-4xl md:text-5xl tracking-tight">Let Note Example App</h1>
        <p className="mt-4 text-muted-foreground">
          Ceci est une application d&apos;exemple: le frontend React appelle un backend Rust local.
        </p>
        <p className="mt-4">
          Etat du backend: <strong>{health}</strong>
        </p>
        <Button className="mt-6" onClick={loadHealth}>
          <RefreshCcw className="h-4 w-4" />
          Rafraichir le statut
        </Button>
      </section>
    </main>
  );
}
