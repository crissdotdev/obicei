import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signup, login, error } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const mountedAt = useRef(Date.now());

  const canSubmit = username.trim().length > 0 && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const meta: { _t: number; website?: string } = { _t: mountedAt.current };
    if (honeypot) meta.website = honeypot;

    setSubmitting(true);
    if (isSignup) {
      await signup(username.trim(), password, meta);
    } else {
      await login(username.trim(), password, meta);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-[24px]">
      <h1
        className="text-[42px] leading-none text-[var(--primary)] mb-[8px]"
        style={{ fontFamily: "'Ndot57Regular', monospace" }}
      >
        obicei
      </h1>
      <p className="font-mono text-[13px] text-[var(--secondary)] mb-[32px]">
        {isSignup ? 'Create an account' : 'Sign in to your account'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-[16px]">
        {/* Honeypot — invisible to humans, bots auto-fill it */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[6px]">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            className="w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[6px]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
          />
        </div>

        {error && (
          <p className="font-mono text-[13px] text-red-500">
            {error}
          </p>
        )}

        {isSignup && (
          <p className="font-mono text-[11px] text-[var(--secondary)] leading-[1.4]">
            There is no password recovery. Your data is encrypted with your password. If you forget it, your data cannot be recovered.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`w-full py-[12px] rounded-[8px] font-mono text-[16px] font-semibold border-none cursor-pointer transition-colors ${
            canSubmit && !submitting
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--primary-15)] text-[var(--secondary)]'
          }`}
        >
          {submitting ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <button
        onClick={() => {
          setIsSignup(!isSignup);
          setUsername('');
          setPassword('');
        }}
        className="mt-[24px] font-mono text-[14px] text-[var(--accent)] bg-transparent border-none cursor-pointer"
      >
        {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
      </button>
    </div>
  );
}
