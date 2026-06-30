import type { MediaAsset } from "@/data/portfolio";

export function ProjectMedia({ media, featured = false }: { media: MediaAsset[]; featured?: boolean }) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className={featured ? "media-grid featured-media-grid" : "media-grid"}>
      {media.map((asset) => (
        <figure className="media-frame" key={asset.src}>
          {asset.type === "video" ? (
            <video controls muted playsInline preload="none" poster={asset.poster} aria-label={asset.alt}>
              <source src={asset.src} type="video/mp4" />
            </video>
          ) : asset.darkSrc ? (
            <button
              className="media-expand-button"
              type="button"
              data-image-lightbox={asset.src}
              data-image-lightbox-dark={asset.darkSrc}
              aria-label={`Expand ${asset.alt}`}
            >
              <img className="theme-media-light" src={asset.src} alt={asset.alt} loading="lazy" decoding="async" />
              <img className="theme-media-dark" src={asset.darkSrc} alt="" loading="lazy" decoding="async" />
            </button>
          ) : (
            <button className="media-expand-button" type="button" data-image-lightbox={asset.src} aria-label={`Expand ${asset.alt}`}>
              <img src={asset.src} alt={asset.alt} loading="lazy" decoding="async" />
            </button>
          )}
          <figcaption>
            <span>{asset.caption}</span>
            <small>
              {asset.isGenerated ? "Visualization" : "Project media"}
              {asset.isSanitized ? " / sanitized" : ""}
            </small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
