import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rpg-theme';

/**
 * Light/dark mode. Respects `prefers-color-scheme` on first load, then persists
 * the user's explicit choice. Toggles the `.dark` class on <html>, which is what
 * Spartan UI's `dark:` variant and the theme tokens in styles.css key off.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _theme = signal<Theme>(this.readInitialTheme());

  public readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      this._document.documentElement.classList.toggle('dark', this._theme() === 'dark');
    });
  }

  public setTheme(theme: Theme): void {
    this._theme.set(theme);
    try {
      this._document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private mode) — keep the in-memory choice.
    }
  }

  public toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private readInitialTheme(): Theme {
    const win = this._document.defaultView;
    try {
      const stored = win?.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return win?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
