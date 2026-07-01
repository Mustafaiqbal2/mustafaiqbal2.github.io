import type { MediaAsset } from "@/data/portfolio";
import { CarouselRail } from "@/components/CarouselRail";

function mediaLabel(asset: MediaAsset) {
  if (asset.sourceKind === "thesis-evidence") return "Thesis figure";
  if (asset.sourceKind === "sanitized-artifact") return "Technical artifact";
  if (asset.sourceKind === "repo-derived-visualization" || asset.isGenerated) return "Architecture visualization";
  if (asset.type === "video") return "Product recording";
  return "Product media";
}

export function ProjectMedia({ media, featured = false }: { media: MediaAsset[]; featured?: boolean }) {
  if (media.length === 0) {
    return null;
  }

  return (
    <CarouselRail
      label={featured ? "Featured project media" : "Project media"}
      className={featured ? "media-carousel featured-media-carousel" : "media-carousel"}
      itemClassName={featured ? "featured-media-item" : "media-carousel-item"}
    >
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
              data-image-alt={asset.alt}
              aria-label={`Expand ${asset.alt}`}
            >
              <img className="theme-media-light" src={asset.src} alt={asset.alt} loading="lazy" decoding="async" />
              <img className="theme-media-dark" src={asset.darkSrc} alt="" loading="lazy" decoding="async" />
            </button>
          ) : (
            <button
              className="media-expand-button"
              type="button"
              data-image-lightbox={asset.src}
              data-image-alt={asset.alt}
              aria-label={`Expand ${asset.alt}`}
            >
              <img src={asset.src} alt={asset.alt} loading="lazy" decoding="async" />
            </button>
          )}
          <figcaption>
            <span>{asset.caption}</span>
            <small>{mediaLabel(asset)}</small>
          </figcaption>
        </figure>
      ))}
    </CarouselRail>
  );
}
