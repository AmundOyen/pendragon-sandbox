import { VIEW_HEIGHT, VIEW_WIDTH } from './geometry';

/**
 * Export a rendered shield as a standalone SVG document. Elements marked `data-ui`
 * (selection outlines, handles) are left out.
 */
export function serializeShield(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-ui]').forEach((el) => el.remove());
  // Angular adds attributes and comments that mean nothing outside the app.
  const walker = clone.ownerDocument.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.parentNode?.removeChild(c));
  for (const el of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes)) {
      if (
        attr.name.startsWith('_ng') ||
        attr.name === 'class' ||
        attr.name === 'tabindex' ||
        attr.name.startsWith('aria-') ||
        attr.name === 'role'
      ) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.getAttribute('style') !== null && el !== clone) el.removeAttribute('style');
  }
  clone.removeAttribute('style');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(VIEW_WIDTH));
  clone.setAttribute('height', String(VIEW_HEIGHT));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

/** Render SVG markup to a PNG of the given width (height follows the shield's aspect). */
export async function svgToPng(markup: string, width = 1024): Promise<Blob> {
  const height = Math.round((width * VIEW_HEIGHT) / VIEW_WIDTH);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.width = width;
    image.height = height;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The shield could not be drawn as an image.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot draw to a canvas.');
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('The PNG could not be created.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name from a coat of arms' name, e.g. "Sir Bors" → "sir-bors". */
export function fileSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'coat-of-arms';
}
