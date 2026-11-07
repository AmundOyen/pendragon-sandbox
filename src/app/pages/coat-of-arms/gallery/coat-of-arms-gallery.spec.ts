import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { CoatOfArmsPage } from '../coat-of-arms';
import { CoatOfArmsService } from '../coat-of-arms.service';
import { newCoat } from '../heraldry/model';
import { FakeCoatOfArmsService } from '../testing/fake-coat-of-arms.service';
import { CoatOfArmsGalleryPage } from './coat-of-arms-gallery';

describe('CoatOfArmsGalleryPage', () => {
  let service: FakeCoatOfArmsService;

  beforeEach(() => {
    service = new FakeCoatOfArmsService();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: CoatOfArmsService, useValue: service }],
    });
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/coat-of-arms/gallery', CoatOfArmsGalleryPage);
    await harness.fixture.whenStable();
    return { harness, el: harness.routeNativeElement! };
  }

  it('invites you to design one when the gallery is empty', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.gallery-item').length).toBe(0);
    expect(el.textContent).toContain('No saved coats of arms yet');
  });

  it('lists saved coats of arms, newest first', async () => {
    await service.coats.add({ ...newCoat(1), name: 'Sir Kay', updatedAt: 100 });
    await service.coats.add({ ...newCoat(1), name: '', updatedAt: 200 });
    const { el } = await render();
    const items = Array.from(el.querySelectorAll('.gallery-item'));
    expect(items.map((i) => i.querySelector('.text-sm')!.textContent!.trim())).toEqual([
      'Untitled arms',
      'Sir Kay',
    ]);
    expect(items[0].querySelector('app-heraldic-shield svg')).not.toBeNull();
  });

  it('opens a coat of arms in the designer', async () => {
    const saved = await service.coats.add({ ...newCoat(1), name: 'Sir Kay' });
    const { harness, el } = await render();
    const link = el.querySelector<HTMLAnchorElement>('.gallery-item a')!;
    expect(link.getAttribute('href')).toBe(`/coat-of-arms?coat=${saved.id}`);

    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/coat-of-arms?coat=${saved.id}`);
    expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(CoatOfArmsPage);
  });

  it('deletes a coat of arms after asking', async () => {
    await service.coats.add({ ...newCoat(1), name: 'Sir Kay' });
    const { harness, el } = await render();
    el.querySelector<HTMLButtonElement>('.delete-saved')!.click();
    await harness.fixture.whenStable();
    expect(confirm).toHaveBeenCalled();
    expect(await service.coats.read()).toHaveLength(0);
    expect(el.querySelectorAll('.gallery-item').length).toBe(0);
  });
});
