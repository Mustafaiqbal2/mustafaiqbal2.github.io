import type { CSSProperties, ReactNode } from "react";

type RevealElement = "div" | "article" | "section" | "aside";

type RevealProps = {
  as?: RevealElement;
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ as = "div", children, className, delay = 0 }: RevealProps) {
  const classes = ["reveal", className].filter(Boolean).join(" ");
  const style = delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined;

  if (as === "article") {
    return (
      <article className={classes} style={style}>
        {children}
      </article>
    );
  }

  if (as === "section") {
    return (
      <section className={classes} style={style}>
        {children}
      </section>
    );
  }

  if (as === "aside") {
    return (
      <aside className={classes} style={style}>
        {children}
      </aside>
    );
  }

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
