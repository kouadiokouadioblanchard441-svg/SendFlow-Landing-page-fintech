---
name: Free image cleanup
description: Local cleanup for generated PNGs that visually contain a checkerboard background.
---

When background-removal tooling is unavailable, generated PNGs can be cleaned locally with ImageMagick by making checkerboard colors transparent and verifying the result in the rendered app. With ImageMagick 7, use the draw primitive `color x,y floodfill`; `matte` is rejected.

**Why:** The generation pipeline can return a TrueColor PNG with a visible checkerboard even when transparency was requested, the dedicated removal callback may not be available, and ImageMagick 7 no longer accepts the older `matte` draw primitive.

**How to apply:** Use `-alpha on -fuzz <threshold> -fill none -draw 'color 0,0 floodfill'` to create a separate `-clean.png` rather than overwriting the source. Verify alpha on background pixels, then confirm the browser render—not only the file preview—has no checkerboard artifacts.