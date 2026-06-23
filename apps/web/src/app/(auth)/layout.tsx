import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso | Deluxnet',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 overflow-hidden p-4">
      {/* Prismatic colorful background blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[80px] opacity-35 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-rose-500 rounded-full mix-blend-screen filter blur-[90px] opacity-25 animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-pulse pointer-events-none" />
      
      {/* Glass card container */}
      <div className="relative z-10 w-full max-w-md glass-card glass-shine bg-slate-900/50 border-white/10 p-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 tracking-tight">Deluxnet</h1>
          <p className="mt-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Plataforma ISP Rural</p>
        </div>
        {children}
      </div>
    </div>
  );
}
