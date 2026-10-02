# Meeno woodland walk

Current implementation replaces the earlier perspective-warped landscape with a Three.js scene. The old landscape and portrait artwork are static loading / unavailable-WebGL fallbacks only; they no longer scale with scroll.

The camera walks 74 world metres along a curved, uneven hiking trail at a fixed 58-degree field of view. Terrain, stones, trees and lamps have independent world positions. Trees and plants use original pixel-art cutouts on upright game-style billboards; this is a 2.5D scene with 3D terrain, not a photorealistic 3D simulation. The camera passes the objects. The ground and stones are geometry. The sky is a separate procedural dome and distant ridges are world geometry. Regular cross-path roots were removed after they read as repeated dark lines.

Lighting uses a low cool ambient level plus small, distance-limited pools of amber illumination from ten lanterns. The banks have additional shadow attenuation and continuous layers of ferns and shrubs; the original route and landmarks stay in place. Leaf movement and light flicker run gently at rest. The sky includes coloured galactic dust, two distant spiral forms, twinkling stars, and intermittent short meteors. Eyes blink in the undergrowth and vanish on approach. Two squirrels remain hidden until triggered, emerge from placed bushes, cross, and disappear into the opposite bank. Their sprites use explicit UV mirroring selected from projected movement, with positive geometry scale. Scroll reversal restores earlier positions and resets encounters when sufficiently far away.

The underwater gate retains its composition and palette. Its polish pass adds fanned light shafts, continuous particles at two depths, finer translucent jellyfish tissue, two distant jellyfish, small distant fish schools, moving seagrass, and restrained glass reflections on the password panel. Existing static corals remain cached. Reduced motion freezes the added movement.

The user's revised narrative is encrypted in content.json and decrypted at password entry. Seven groups appear at defined positions on the trail, with two delayed follow-up lines beneath their original sentences. Authored line breaks are preserved. The date question has its own restrained serif composition and becomes interactive only at the actual scroll endpoint. No moves away from pointer proximity or touch-down within a bounded area that keeps Yes clear. Yes remains a local interaction; it sends no message or booking.

Yes fixes the scene to the viewport, freezes the walk, and tilts the existing camera toward the sky without changing its position or field of view. A roughly 35-second ending includes the camera movement and four compound shells, ending in gold. Each rocket opens into one large spherical burst, then 12–18 smaller flowers bloom from travelling seeds inside it. A shell finishes before the next rocket launches. Parent sparks, seeds, and secondary flowers share ballistic drag and gravity; secondary origins are computed from the actual seed trajectories. The smaller bursts have softer, shorter crackles. Particle data is allocated during scene preparation. Portrait framing keeps shells inside the view. The return button appears after all embers expire and rewinds the existing trail renderer to its beginning, resetting messages, encounters, choices, and show time while preserving the unlocked story and forest ambience. Show time pauses while the tab is hidden.

Welcome! sits above the original password panel. Web Audio generates quiet ocean surf, forest wind and cricket pulses locally, plus subdued firework rumbles. Sound begins on the first user interaction, respecting mobile autoplay requirements, with a persistent mute control. Ocean and woods crossfade when the gate opens. Background tabs suspend audio. Lamp illumination is further reduced and the flame cores, halos and nearby light have uneven, low-amplitude flicker.

Reduced motion keeps the walking camera still while allowing the message sequence through scrolling; the ending shortens its camera transition and softens particle intensity. Native scrolling remains available during the walk. The scene pauses when the tab is hidden. No Playwright or browser testing was performed for this spatial rebuild or finishing pass, at the user's explicit request. Validation uses TypeScript, production build, and Node checks covering movement, wildlife, cover, narrative timing, delayed lines, the final-question boundary, fireworks lifetime/allocation, content schema, and mobile button bounds. These checks do not constitute visual or audio verification.

Assets generated with the built-in imagegen tool, converted to WebP with alpha preserved:
- public/meeno/woodland-trees.webp: three complete tree cutouts.
- public/meeno/woodland-details.webp: ferns, shrub, rock, lamp, and two squirrel poses.

The previous woods-landscape.webp / woods-portrait.webp remain static fallbacks. woods-foreground.webp is retained from the superseded draft and is not loaded by the spatial renderer.

## Tree atlas prompt

Use case: stylized-concept
Asset type: transparent sprite atlas for a 3D pixel-art woodland walking game, 1536x1024, three equal 512x1024 columns.
Reference image supplies ONLY art style and foliage detail. Create THREE SEPARATE COMPLETE TREES on a truly transparent background, one centered in each column. Each tree is rooted at y=990, top at y=30, all branches stay inside its own 512px column with 20px clear padding. No overlaps between columns.
Column 1: a crooked old oak with tall rough narrow trunk, forked branches, sparse irregular dark-green canopy high up, some ivy and exposed roots.
Column 2: a wild thin pine with asymmetric irregular needle branches, not a triangular Christmas tree, a trunk visible through the foliage.
Column 3: a differently shaped old woodland oak, slightly leaning with high draped branching and scattered leaves.
Style: the SAME detailed fine-grained pixel-art environmental style as the reference, mature 1990s adventure game craftsmanship, deliberate tiny pixel clusters, naturally observed bark, leaves, lichen and roots. No cartoon outlines, no smooth painting, no voxel or polygon shapes. Palette of natural olive/forest greens and brown-grey bark, restrained cool moonlight on some edges. Keep midtones visible so game lighting can darken and relight each tree; no amber lamp lighting baked in.
Transparent alpha surrounding EACH tree and between leaves. No environment, no dirt floor, no rectangular base, no sky, no lamps, no text, no labels, no grid lines, no black backdrop. Isolated full trees including trunk bases and roots.

## Detail atlas prompt

Use case: stylized-concept
Asset type: transparent 1536x1024 pixel-art game sprite atlas, EXACTLY 3 columns by 2 rows of equal 512x512 cells, no grid lines.
Match the reference's exquisitely detailed mature adventure-game pixel art, natural woodland, visible tiny pixel clusters, bark and leaf detail.
Place one complete isolated subject inside EACH cell with at least 28px transparent padding, centered horizontally, ground contact at y=480 within each cell. All background genuinely transparent alpha, including between leaves.
TOP LEFT cell: a sprawling lush forest fern/bracken clump with long different angled fronds, green and cool moonlit edges.
TOP MIDDLE cell: an irregular dense oak sapling and leafy scrub shrub with tangled fine twigs, natural olive and forest greens.
TOP RIGHT cell: one craggy mossy limestone boulder with some little ferns growing out of its base.
BOTTOM LEFT cell: one slender weathered wooden lantern post with simple projecting arm, an antique small iron coach lantern hanging from it glowing warm amber. Entire post from top to foot, period wilderness lantern, not a modern street light.
BOTTOM MIDDLE cell: an anatomically natural small brown squirrel, side profile facing right, standing alert on all fours, long fluffy curled tail, no cartoon face.
BOTTOM RIGHT cell: the SAME squirrel and size, facing right, in a stretched running stride with back arched and tail streaming behind, recognizable limb motion.
No cast ground rectangles, no scenery, no text, no labels, no human, no halos around cutout edges. The terrain and trees will be constructed in 3D separately. Materials should be midtone and textured so dynamic scene lighting can shade them.
