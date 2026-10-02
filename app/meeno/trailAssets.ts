export type TrailArtwork = { trees: HTMLImageElement; details: HTMLImageElement };
const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  const cached = images.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => image.decode().then(() => resolve(image), () => resolve(image));
    image.onerror = () => { images.delete(src); reject(new Error(`Could not load ${src}`)); };
    image.src = src;
  });
  images.set(src, promise);
  return promise;
}

export async function loadTrailArtwork(): Promise<TrailArtwork> {
  const [trees, details] = await Promise.all([
    loadImage("/meeno/woodland-trees.webp"),
    loadImage("/meeno/woodland-details.webp")
  ]);
  return { trees, details };
}
