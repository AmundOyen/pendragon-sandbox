import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ThemeService } from './core/theme/theme.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the sidebar with navigation and theme actions', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-sidebar')).toBeTruthy();
    expect(el.textContent).toContain('Home');
    expect(el.textContent).toContain('Dark mode');
  });
});

describe('ThemeService', () => {
  it('toggles the dark class on <html>', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    service.setTheme('light');
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
