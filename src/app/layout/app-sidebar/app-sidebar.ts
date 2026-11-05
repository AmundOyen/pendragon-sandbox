import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { type Theme, ThemeService } from '../../core/theme/theme.service';

interface NavItem {
  label: string;
  /** RPG Awesome icon class, e.g. `ra-tower` (https://nagoshiashumari.github.io/Rpg-Awesome/). */
  icon: string;
  route: string;
  exact?: boolean;
}

interface ThemeAction {
  theme: Theme;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [HlmSidebarImports, NgIcon, RouterLink, RouterLinkActive],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-sidebar.html',
})
export class AppSidebar {
  protected readonly themeService = inject(ThemeService);

  protected readonly navItems: NavItem[] = [
    { label: 'Home', icon: 'ra-tower', route: '/', exact: true },
    { label: 'Samhladh Invocations', icon: 'ra-aura', route: '/samhladh' },
    { label: 'Dice Tray', icon: 'ra-perspective-dice-six', route: '/dice' },
  ];

  protected readonly themeActions: ThemeAction[] = [
    { theme: 'light', label: 'Light mode', icon: 'lucideSun' },
    { theme: 'dark', label: 'Dark mode', icon: 'lucideMoon' },
  ];
}
