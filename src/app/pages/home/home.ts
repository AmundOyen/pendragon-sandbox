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
          <img src="rpgworld-mark.svg" alt="" class="size-16" width="64" height="64" />
          <h1 hlmCardTitle class="font-display text-3xl font-bold">Welcome to RPG World</h1>
          <p hlmCardDescription class="text-base">Your character, always at hand.</p>
        </div>
        <div hlmCardContent>
          <p class="font-display text-center text-xl leading-relaxed">
            The tavern is quiet for now. Pull up a chair — this is where your knights will be built,
            tracked and carried from their first winter phase to their last great deed.
          </p>
        </div>
      </section>
    </section>
  `,
})
export class Home {}
