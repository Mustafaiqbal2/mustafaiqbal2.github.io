import { Children, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type CarouselRailProps = {
  label: string;
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  auto?: boolean;
};

export function CarouselRail({ label, children, className = "", itemClassName = "", auto = false }: CarouselRailProps) {
  const items = Children.toArray(children);

  if (!items.length) {
    return null;
  }

  return (
    <div className={`carousel-rail ${className}`.trim()} data-carousel-rail data-carousel-auto={auto ? "true" : undefined}>
      <div className="carousel-rail-controls" aria-label={`${label} controls`}>
        <button type="button" data-carousel-rail-prev aria-label={`Previous ${label}`}>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="carousel-rail-position" aria-hidden="true">
          <span data-carousel-rail-current>01</span>
          <i />
          <span>{String(items.length).padStart(2, "0")}</span>
        </div>
        <button type="button" data-carousel-rail-next aria-label={`Next ${label}`}>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="carousel-rail-track" data-carousel-rail-track tabIndex={0} aria-label={label}>
        {items.map((item, index) => (
          <div className={`carousel-rail-item ${itemClassName}`.trim()} data-carousel-rail-item key={index}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
