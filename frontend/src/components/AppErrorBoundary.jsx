import React from 'react';

export default class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('SignSpeak UI error', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-slate-100"><section className="w-full max-w-lg rounded-3xl border border-rose-400/30 bg-rose-400/10 p-8 shadow-2xl"><p className="font-mono text-xs uppercase tracking-[0.22em] text-rose-300">Interface error</p><h1 className="mt-3 font-display text-2xl font-bold">The interface stopped unexpectedly</h1><p className="mt-3 text-sm leading-relaxed text-slate-300">Reload the page to recover. If this continues, share the browser console error.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 shadow-glow">Reload interface</button></section></main>;
  }
}
