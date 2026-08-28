"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./listening-room-choreography.css";

gsap.registerPlugin(ScrollTrigger);

export function ListeningRoomChoreography({ signal }: { signal: number }) {
  const lastEntranceSignal = useRef(signal);

  /* Tab entrance stays isolated from the page's scroll choreography. */
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (signal <= lastEntranceSignal.current) return;
    lastEntranceSignal.current = signal;

    const room = document.querySelector<HTMLElement>(".mu .lr");
    if (!room) return;

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { overwrite: "auto" } });
      const heroImage = room.querySelector(".lr-entry__cover img, .lr-entry__cover .lr-cover-fallback");
      const heroDetails = room.querySelectorAll(".lr-entry__track > *, .lr-entry__art > svg");

      heroTimeline.fromTo(
        ".lr-entry__copy > *",
        { autoAlpha: 0, x: -14 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out"
        },
        0.08
      );

      if (heroImage) {
        heroTimeline.fromTo(
          heroImage,
          { scale: 1.13 },
          {
            scale: 1,
            duration: 1.05,
            ease: "power3.out"
          },
          0
        );
      }

      heroTimeline.fromTo(
        heroDetails,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.52,
          stagger: 0.045,
          ease: "power3.out"
        },
        0.38
      );
    }, room);

    return () => context.revert();
  }, [signal]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let context: gsap.Context | null = null;
    let observer: MutationObserver | null = null;
    let disposed = false;

    const setup = () => {
      if (disposed || context) return true;
      const room = document.querySelector<HTMLElement>(".mu .lr");
      const entry = room?.querySelector<HTMLElement>(".lr-entry");
      if (!room || !entry) return false;

      context = gsap.context(() => {
        const playlists = room.querySelector<HTMLElement>(".lr-playlists");
        if (playlists) {
          const playlistDetails = gsap.timeline({
            scrollTrigger: {
              trigger: playlists,
              start: "top top",
              end: "+=145%",
              scrub: 0.7,
              invalidateOnRefresh: true
            }
          });

          playlistDetails
            .fromTo(
              ".lr-playlist__cover img, .lr-playlist__cover .lr-cover-fallback",
              { scale: 1.12 },
              {
                scale: 1,
                duration: 0.72,
                stagger: 0.04,
                ease: "power3.out"
              },
              0.1
            )
            .fromTo(
              ".lr-playlist__number",
              { autoAlpha: 0, y: 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.34,
                stagger: 0.045,
                ease: "power2.out"
              },
              0.18
            )
            .fromTo(
              ".lr-playlist__meta > *, .lr-playlist > svg",
              { autoAlpha: 0, y: 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.42,
                stagger: 0.026,
                ease: "power3.out"
              },
              0.24
            );
        }

        const taste = room.querySelector<HTMLElement>(".lr-taste");
        if (taste) {
          /* ListeningRoom historically created its own taste timeline and this
             component added a second detail timeline on top. Kill the older
             owner first. One scene should have one animation hierarchy. */
          ScrollTrigger.getAll().forEach((trigger) => {
            if (trigger.trigger === taste) trigger.kill(true);
          });

          const panels = gsap.utils.toArray<HTMLElement>(taste.querySelectorAll(".lr-taste__panel"));
          const periodItems = gsap.utils.toArray<HTMLElement>(taste.querySelectorAll(".lr-period__item"));
          if (panels.length < 3) return;

          const stale = taste.querySelectorAll<HTMLElement>(
            ".lr-section-head > *, .lr-taste__panel, .lr-artist, .lr-track-row, .lr-period__item, .lr-artist__art img, .lr-artist__art .lr-cover-fallback, .lr-artist__meta > *, .lr-track-row__rank, .lr-track-row__cover, .lr-track-row__copy > *, .lr-track-row svg"
          );
          gsap.set(stale, { clearProps: "transform,opacity,visibility,clipPath" });

          const activatePanel = (index: number) => {
            panels.forEach((panel, panelIndex) => {
              const activePanel = panelIndex === index;
              panel.style.pointerEvents = activePanel ? "auto" : "none";
              panel.setAttribute("aria-hidden", activePanel ? "false" : "true");
            });
          };

          activatePanel(0);
          gsap.set(panels[0], { autoAlpha: 1, y: 0, clipPath: "inset(0% 0 0% 0)" });
          gsap.set(panels.slice(1), { autoAlpha: 0, y: 24, clipPath: "inset(5% 0 0 0)" });
          gsap.set(periodItems, { opacity: 0.28, y: 0 });
          gsap.set(periodItems[0], { opacity: 1, y: -2 });

          const tasteTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: taste,
              start: "top top",
              end: "+=480%",
              pin: true,
              scrub: 1.05,
              anticipatePin: 1,
              fastScrollEnd: true,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const index = self.progress < 0.42 ? 0 : self.progress < 0.74 ? 1 : 2;
                activatePanel(index);
              }
            }
          });

          tasteTimeline
            .fromTo(
              ".lr-taste .lr-section-head h3",
              { autoAlpha: 0, y: 34, clipPath: "inset(100% 0 0 0)" },
              {
                autoAlpha: 1,
                y: 0,
                clipPath: "inset(0% 0 0 0)",
                duration: 0.42,
                ease: "power4.out"
              },
              0
            )
            .fromTo(
              ".lr-taste .lr-section-head p",
              { autoAlpha: 0, y: 18 },
              { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" },
              0.08
            )
            .fromTo(
              ".lr-taste .lr-period",
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" },
              0.1
            );

          const addChapter = (
            panel: HTMLElement,
            periodIndex: number,
            at: number,
            exitAt?: number
          ) => {
            const feature = panel.querySelector<HTMLElement>(".lr-artist:first-child");
            const artistRows = panel.querySelectorAll<HTMLElement>(".lr-artist:not(:first-child)");
            const trackRows = panel.querySelectorAll<HTMLElement>(".lr-track-row");

            if (periodIndex > 0) {
              tasteTimeline.fromTo(
                panel,
                { autoAlpha: 0, y: 24, clipPath: "inset(5% 0 0 0)" },
                {
                  autoAlpha: 1,
                  y: 0,
                  clipPath: "inset(0% 0 0 0)",
                  duration: 0.32,
                  ease: "power3.out"
                },
                at
              );
            }

            if (feature) {
              tasteTimeline.fromTo(
                feature,
                { autoAlpha: 0, y: 28, clipPath: "inset(8% 0 0 0)" },
                {
                  autoAlpha: 1,
                  y: 0,
                  clipPath: "inset(0% 0 0 0)",
                  duration: 0.46,
                  ease: "power4.out"
                },
                at + 0.03
              );
            }

            tasteTimeline
              .fromTo(
                artistRows,
                { autoAlpha: 0, y: 18 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.34,
                  stagger: 0.045,
                  ease: "power3.out"
                },
                at + 0.1
              )
              .fromTo(
                trackRows,
                { autoAlpha: 0, y: 16 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.32,
                  stagger: 0.035,
                  ease: "power3.out"
                },
                at + 0.15
              );

            if (exitAt !== undefined) {
              tasteTimeline.to(
                panel,
                {
                  autoAlpha: 0,
                  y: -20,
                  clipPath: "inset(0 0 5% 0)",
                  duration: 0.28,
                  ease: "power2.inOut"
                },
                exitAt
              );
            }
          };

          addChapter(panels[0], 0, 0.24, 1.08);
          tasteTimeline
            .to(periodItems[0], { opacity: 0.28, y: 0, duration: 0.18 }, 1.02)
            .to(periodItems[1], { opacity: 1, y: -2, duration: 0.18 }, 1.02);

          addChapter(panels[1], 1, 1.18, 1.98);
          tasteTimeline
            .to(periodItems[1], { opacity: 0.28, y: 0, duration: 0.18 }, 1.92)
            .to(periodItems[2], { opacity: 1, y: -2, duration: 0.18 }, 1.92);

          addChapter(panels[2], 2, 2.08);
        }

        const snapshot = room.querySelector<HTMLElement>(".lr-snapshot");
        if (snapshot) {
          gsap.fromTo(
            ".lr-insight > *",
            { autoAlpha: 0, y: 10 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.42,
              stagger: 0.035,
              ease: "power2.out",
              scrollTrigger: {
                trigger: snapshot,
                start: "top top",
                end: "+=105%",
                scrub: 0.72
              }
            }
          );
        }

        const recent = room.querySelector<HTMLElement>(".lr-recent");
        if (recent) {
          const recentDetails = gsap.timeline({
            scrollTrigger: {
              trigger: recent,
              start: "top top",
              end: "+=145%",
              scrub: 0.7,
              invalidateOnRefresh: true
            }
          });

          recentDetails
            .fromTo(
              ".lr-recent-card__cover img, .lr-recent-card__cover .lr-cover-fallback",
              { scale: 1.14 },
              {
                scale: 1,
                duration: 0.72,
                stagger: 0.045,
                ease: "power3.out"
              },
              0.08
            )
            .fromTo(
              ".lr-recent-card__copy > *, .lr-recent-card > svg",
              { autoAlpha: 0, y: 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.024,
                ease: "power3.out"
              },
              0.22
            );
        }

        requestAnimationFrame(() => ScrollTrigger.refresh());
      }, room);

      return true;
    };

    if (!setup()) {
      observer = new MutationObserver(() => {
        if (setup()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      context?.revert();
    };
  }, []);

  return null;
}
