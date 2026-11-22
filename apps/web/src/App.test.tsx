import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';

describe('CircuTrace dashboard shell', () => {
  it('renders the workspace dashboard and identifies the preview state', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Good to see you.');
    expect(html).toContain('FOUNDATION PREVIEW');
    expect(html).toContain('Connect your organization to get started');
    expect(html).toContain('No workspace connected');
  });
  it('does not invent operational metrics before a workspace is connected', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Awaiting workspace data');
    expect(html).toContain('Supplier network not connected');
    expect(html).toContain('No activity to show yet');
    expect(html).not.toContain('1,284');
  });
  it('provides keyboard navigation landmarks and a skip link', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Skip to content');
    expect(html).toContain('aria-label="Workspace navigation"');
    expect(html).toContain('aria-label="Primary"');
    expect(html).toContain('id="navigation-search"');
  });
});
