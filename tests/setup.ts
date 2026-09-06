// Minimal test-environment setup mock for HTMLCanvasElement.getContext
// jsdom lacks canvas implementation by default and outputs noisy "Not implemented" warnings.

if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ...args: any[]
  ): any {
    if (contextId === '2d') {
      return {
        canvas: this,
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        strokeText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        arcTo: () => {},
        fill: () => {},
        measureText: (text: string) => ({ width: (text || '').length * 10 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        roundRect: () => {},
      } as unknown as CanvasRenderingContext2D;
    }

    if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
      return null;
    }

    try {
      return originalGetContext.call(this, contextId, ...args);
    } catch {
      return null;
    }
  };
}
