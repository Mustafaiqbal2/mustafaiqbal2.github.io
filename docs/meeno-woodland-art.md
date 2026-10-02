# Meeno woodland entrance

Superseded motion draft. The current implementation is documented in `meeno-spatial-walk.md`; these original background compositions remain static fallbacks only.

Scope: the first stretch of the woods, reached through the existing underwater gate. Narrative and the date question are left for the next design pass.

Art direction: first-person, eye level, a narrow irregular hiking path through Margalla-like woodland. Fine adventure-game pixel art, dark natural greens (#14251f), near-black bark (#080e10), blue moonlight (#2b4865), distant midnight sky (#102545), and small warm lantern pools (#d29b43). No city, carriage, stock photography, or on-screen narrative text.

Movement: scroll travels along a shallow perspective terrain mesh. The separate close tree/fern plane passes faster than the ground; the clearing and sky remain far away. Footstep sway follows scroll distance and rests when scrolling stops. Native scrolling stays available. Reduced motion gives a static view with no long empty scroll. There is a CSS artwork fallback if WebGL is unavailable.

Original art was generated with the built-in imagegen tool. Final project assets (WebP conversions, alpha preserved):
- public/meeno/woods-landscape.webp
- public/meeno/woods-portrait.webp
- public/meeno/woods-foreground.webp

Prompts follow verbatim for future art revisions.

## Landscape

Use case: stylized-concept
Asset type: original background artwork for an immersive first-person scrolling forest walk, wide landscape 1536x1024.
Primary request: An exquisitely art-directed late-1990s point-and-click adventure game forest at night, detailed restrained pixel art with the environmental craft of Thimbleweed Park. We are STANDING ON a narrow hiking footpath, looking ahead into the woods at ordinary human eye level. This is quiet romantic wilderness, not spooky.
Scene: A sinuous narrow worn dirt trail with irregular limestone stones and tree roots begins across the lower center, curves a little right halfway up, then winds left into the small distant clearing at center. Dense irregular Margalla Hills inspired woodland: crooked old pine and oak trunks, layered dark green leaves, fernlike scrub, lichen rocks, wild grasses. Two or three small antique amber coach lanterns on simple weathered wooden posts at DIFFERENT distances along the path, asymmetrically placed; one modest lamp at 29% x 53% y, a smaller lamp at 66% x 49% y, a tiny one deep in the path. Lantern light actually touches nearby bark and leaves and makes small warm pools on the dusty trail. Deep ink-blue shadow and natural forest green dominate, with selective silvery blue moonlight grazing leaf edges. Through a relatively small irregular gap in the upper center canopy, distant blue mountain ridges and a delicate Milky Way / stars are visible. No visible moon needed.
Composition: Immersive first-person view INTO a deep forest, not a panorama overlooking hills. Trees cropped by both sides and above; central 40% remains a legible trail view for phone crop. The sky should occupy about the upper central 25%; woods most of the frame. Layered organic depth, asymmetrical trees, artfully controlled lights. Path has no curbs, tire tracks, paving or symmetry. Foreground bottom path readable but dark. Scenery fills every edge.
Style/medium: Professional mature adventure-game pixel artwork, fine deliberate pixel clusters, subtle dither shading, strong coherent restricted palette, pixel edges approximately 2-3 pixels in this 1536 image. Not fuzzy digital painting. Beautiful densely observed environmental details within distinct dark shadow shapes. Strong spatial composition and light hierarchy.
Lighting/mood: Moonlit, intimate, hushed, late at night. Dark but readable, luminous warm light has a tiny footprint against the larger cool woods.
Avoid: characters, vehicles, carriage, buildings, city, text, lettering, UI, logos, watermark, signs, road, symmetrical lampposts, flat vector trees, cartoon outlines, kawaii, plastic 3D rendering, generic fantasy mushrooms, glowing magic plants, purple fog, excessive teal, huge moon, overbright sky, sunbeams, oversharpened photo texture.
No text anywhere.

## Portrait

Use case: precise-object-edit
Asset type: portrait mobile companion background for a scrolling woodland scene.
Input image: reference and edit target, preserve exactly its art direction, pixel texture, color palette, night lighting and type of wilderness.
Recompose this original woodland into a PORTRAIT 1024x1536 image for a phone screen. Keep a normal human-eye first-person view along the narrow rocky footpath. Dense close green woodland on both sides and over the top, a modest opening to the starry Milky Way and small far mountain ridges in the upper middle third. Place one amber coach lantern on a wooden post at x 22%, y 55%, close to the left edge of the trail; another smaller distant lantern at x 67%, y 52%. The path begins lower center and winds to the right then back left as it recedes into the small central clearing. Roots, uneven dirt, mossy limestone and ferns next to one's feet. More portrait vertical room for close foliage and path, rather than a wide establishing landscape. Pixel clusters with the same exquisite fine pixel-art detail as the reference. Dark moonlit green woodland, blue sky, very localized warm pools of lantern light. Keep terrain legible. Preserve an intimate forest walk; no additional subjects, no text, no UI, no people, no characters, no carriage, no city, no road, no large moon, no magical glowing vegetation.

## Foreground

Use case: background-extraction
Asset type: TRANSPARENT foreground parallax layer for a first-person woodland scene, landscape 1536x1024.
Reference image is used for exact art style, foliage types, pixel cluster scale and night palette. Create only a CLOSE FOREGROUND FRAME of woodland that will be overlaid on this scene. Background must be truly transparent alpha.
Composition: On the extreme left, a cropped rough dark tree trunk begins from x=0, with a few short crooked branches and leafy twigs reaching slightly in at upper left. At the lower left corner, close bracken and a mossy limestone rock. On the lower right corner, a different cluster of fern fronds, oak saplings and a cropped rocky bank. The central 65% width MUST BE ENTIRELY TRANSPARENT, and most of the top and right side transparent. Silhouettes are asymmetrical, irregular, slender, natural and mostly confined to the outermost 15% of each side and bottom corners. Nothing stretches across the middle. Not a symmetrical vignette. No middle-distance scenery.
Lighting: Very dark desaturated forest greens and blue-black shadow, faint blue moonlit edges, a few extremely subtle muted amber pixels on inward-facing leaves only. These are darker than the reference, they are nearest to the viewer and mostly unlit.
Style: exquisite fine pixel art, deliberate visible square pixel clusters, same mature adventure game style as reference, detailed ferns and organic bark, crisp alpha edges, no blurry antialias halos. No sky, NO OPAQUE BACKGROUND, no dirt path, no ground rectangle, no lantern, no stars, no text, no UI, no scenery outside these foreground plants and trunk.
