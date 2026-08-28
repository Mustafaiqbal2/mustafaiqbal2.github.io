"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./listening-room-choreography.css";

gsap.registerPlugin(ScrollTrigger);

export function ListeningRoomChoreography({ signal }: { signal: number }) {
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
        /* The curtain reveals a page that is already alive. This entrance only
           animates inner details, leaving the Listening Room's pinned geometry
           to its existing scroll timelines. */
        if (signal > 0) {
          const heroTimeline = gsap.timeline({ defaults: { overwrite: "auto" } });
          const heroImage = room.querySelector(".lr-entry__cover img, .lr-entry__cover .lr-cover-fallback");
          const heroDetails = room.querySelectorAll(".lr-entry__track > *, .lr-entry__art > svg");

          heroTimeline
            .fromTo(
              ".lr-entry__copy > *",
              { autoAlpha: 0, filter: "blur(8px)" },
              {
                autoAlpha: 1,
                filter: "blur(0px)",
                duration: 0.72,
                stagger: 0.08,
                ease: "power3.out"
              },
              0.08
            );

          if (heroImage) {
            heroTimeline.fromTo(
              heroImage,
              { scale: 1.13, filter: "saturate(0.72) contrast(0.94)" },
              {
                scale: 1,
                filter: "saturate(1) contrast(1)",
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
        }

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
              { scale: 1.12, filter: "saturate(0.72) brightness(0.82)" },
              {
                scale: 1,
                filter: "saturate(1) brightness(1)",
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
          const tasteDetails = gsap.timeline({
            scrollTrigger: {
              trigger: taste,
              start: "top top",
              end: "+=135%",
              scrub: 0.75,
              invalidateOnRefresh: true
            }
          });

          tasteDetails
            .fromTo(
              ".lr-taste__panel--short .lr-artist__art img, .lr-taste__panel--short .lr-artist__art .lr-cover-fallback",
              { scale: 1.12, filter: "saturate(0.78)" },
              {
                scale: 1,
                filter: "saturate(1)",
                duration: 0.68,
                stagger: 0.045,
                ease: "power3.out"
              },
              0.12
            )
            .fromTo(
              ".lr-taste__panel--short .lr-artist__meta > *, .lr-taste__panel--short .lr-track-row__rank, .lr-taste__panel--short .lr-track-row__copy > *, .lr-taste__panel--short .lr-track-row svg",
              { autoAlpha: 0, y: 10 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.38,
                stagger: 0.018,
                ease: "power2.out"
              },
              0.22
            );
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
              { scale: 1.14, filter: "saturate(0.7) brightness(0.84)" },
              {
                scale: 1,
                filter: "saturate(1) brightness(1)",
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
  }, [signal]);

  return null;
}
