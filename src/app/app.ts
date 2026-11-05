import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { AppSidebar } from './layout/app-sidebar/app-sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppSidebar, HlmSidebarImports, HlmSeparator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmSidebarWrapper>
      <app-sidebar />
      <main hlmSidebarInset>
        <header
          class="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4"
        >
          <button hlmSidebarTrigger class="-ms-1"></button>
          <hlm-separator
            orientation="vertical"
            class="me-2 data-vertical:h-4 data-vertical:self-center"
          />
          <span class="font-display text-lg font-semibold">Pendragon Sandbox</span>
        </header>
        <div class="flex-1">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class App {}
