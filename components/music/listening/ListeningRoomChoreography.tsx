"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./listening-room-choreography.css";

gsap.registerPlugin(ScrollTrigger);

export function ListeningRoomChoreography({ signal }: { signal: number }) {
  const lastEntranceSignal = useRef(signal);

  /* The entrance reveal is deliberately isolated from the scroll timelines.
     Changing `signal` must never tear down ScrollTrigger while the white tab
     curtain is moving. */
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

  /* Secondary detail choreography must never own the Artists/Tracks scene.
     That pinned chapter is fully owned by ListeningRoom.tsx so its spacer and
     every downstream ScrollTrigger are measured in one context. */
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
