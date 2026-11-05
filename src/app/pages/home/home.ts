import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-home',
  imports: [HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-8">
      <section hlmCard class="shadow-(--rpg-shadow-sm)">
        <div hlmCardHeader class="flex flex-col items-center gap-4 text-center">
          <img src="pendragon-mark.svg" alt="" class="size-16" width="64" height="64" />
          <h1 hlmCardTitle class="font-display text-3xl font-bold">Welcome to Pendragon Sandbox</h1>
          <p hlmCardDescription class="text-base">Pendragon tools</p>
        </div>
        <div hlmCardContent>
          <p class="font-display text-center text-xl leading-relaxed">
            This is your Pendragon toolbox — a growing set of tools for running and playing King
            Arthur Pendragon. Knights, winter phases, glory and the odd family history: it all ends
            up here, close at hand when the table needs it.
          </p>
        </div>
      </section>
    </section>
  `,
})
export class Home {}
