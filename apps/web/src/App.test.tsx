import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { AuthScreen } from './App';

describe('CircuTrace authenticated workspace shell', () => {
  it('waits for secure session restoration before showing tenant data', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Restoring your secure session');
    expect(html).not.toContain('Good to see you.');
    expect(html).not.toContain('No organization');
  });
  it('renders sign-in and account creation modes with accessible form controls', () => {
    const html = renderToStaticMarkup(<AuthScreen onAuthenticated={() => undefined} />);
    expect(html).toContain('Welcome back.');
    expect(html).toContain('Sign in securely');
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('Create account');
    expect(html).toContain('Refresh sessions are held in an HttpOnly cookie');
  });
  it('explains that refresh credentials are not exposed to browser JavaScript', () => {
    const html = renderToStaticMarkup(<AuthScreen onAuthenticated={() => undefined} />);
    expect(html).toContain('not stored in browser storage');
  });
});
