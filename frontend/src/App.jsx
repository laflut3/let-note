import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [mode, setMode] = useState('login');

  const isLogin = mode === 'login';
  const toggleMode = () => setMode((prev) => (prev === 'login' ? 'register' : 'login'));

  return (
    <main className="min-h-screen grid place-items-center p-4 md:p-8">
      <section className="relative w-full max-w-6xl h-[680px] md:h-[760px] overflow-hidden rounded-lg border border-border shadow-[0_24px_80px_rgba(120,0,90,0.2)]">
        <div className="absolute inset-0 grid md:grid-cols-2">
          <div className="hidden md:block bg-[#8f116e]" />
          <div
            className="bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80')",
            }}
          />
        </div>

        <div
          className={[
            'absolute top-1/2 -translate-y-1/2 w-[88%] md:w-[46%] p-6 md:p-10 rounded-2xl',
            'bg-[#a52382]/88 text-white backdrop-blur-[2px]',
            'transition-all duration-500 ease-in-out',
            isLogin ? 'left-[6%] md:left-[52%]' : 'left-[6%] md:left-[2%]',
          ].join(' ')}
        >
          <h1 className="text-center text-4xl md:text-5xl tracking-widest uppercase">
            {isLogin ? 'Login' : 'Register'}
          </h1>

          <form className="mt-8 space-y-4" onSubmit={(event) => event.preventDefault()}>
            {!isLogin && (
              <input
                type="text"
                placeholder="Full name"
                className="w-full h-12 px-4 rounded-none border-none bg-white text-black placeholder:text-gray-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              className="w-full h-12 px-4 rounded-none border-none bg-white text-black placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full h-12 px-4 rounded-none border-none bg-white text-black placeholder:text-gray-500"
            />
            {!isLogin && (
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full h-12 px-4 rounded-none border-none bg-white text-black placeholder:text-gray-500"
              />
            )}

            <Button
              type="submit"
              variant="secondary"
              className="mx-auto mt-8 flex h-11 min-w-36 rounded-none bg-white text-black hover:bg-white/90"
            >
              {isLogin ? 'login' : 'register'}
            </Button>
          </form>

          <button
            type="button"
            onClick={toggleMode}
            className="mt-6 block w-full text-center text-sm underline underline-offset-4"
          >
            {isLogin ? 'Switch to register' : 'Switch to login'}
          </button>
        </div>
      </section>
    </main>
  );
}
