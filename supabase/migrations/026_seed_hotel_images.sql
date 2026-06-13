-- ============================================================
-- Migration 026: Seed hotel gallery images
-- Date: 2026-06-07
--
-- All image URLs are verified real photos from Unsplash (free tier).
-- For every hotel with fewer than 5 gallery images, inserts themed
-- photos up to 5 total. Existing images and sort_order are preserved.
--
-- Photo sources (Unsplash – free license):
--   Desert  : Bab Al Shams Dubai pool, infinity pool, resort entrance…
--   Beach   : Maldives W Hotel villa, overwater bungalow, tropical coast…
--   Palace  : Atlantis lobby, grand sunlit lobby, designer lobby…
--   Mountain: Night ski resort, alpine mansion, mountain chalet…
--   City    : Hotel room city view, city skyline, rooftop pool night…
--   Fallback: Generic luxury hotel pool, suite, lobby…
--
-- Theme selection (first match wins, case-insensitive):
--   Desert › Beach › Palace/Grand › Mountain › City › Fallback
-- ============================================================

DO $$
DECLARE
  h          RECORD;
  img_count  INTEGER;
  max_ord    INTEGER;
  imgs       TEXT[];
  n          TEXT;
  i          INTEGER;
BEGIN
  FOR h IN
    SELECT id,
           LOWER(name)               AS nm,
           LOWER(COALESCE(city,''))  AS ct
    FROM   hotels
    ORDER  BY id
  LOOP
    SELECT COUNT(*), COALESCE(MAX(sort_order), -1)
    INTO   img_count, max_ord
    FROM   hotel_images
    WHERE  hotel_id = h.id;

    CONTINUE WHEN img_count >= 5;

    n := h.nm || ' ' || h.ct;

    -- ── 1. Desert / Oasis / Dune / UAE ───────────────────────
    IF  n LIKE '%desert%' OR n LIKE '%oasis%' OR n LIKE '%dune%'
     OR h.ct IN ('dubai','abu dhabi','sharjah','ras al khaimah','muscat')
    THEN
      -- Real photos: Bab Al Shams Dubai resort pool, infinity sunset pool,
      --              resort entrance palms, hotel pool umbrellas, suite interior
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1682879654264-5f2a52e1ea0f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1758448756167-88dc934c58e4?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1682879654288-3bc35430b79f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1716667282993-cd8f2bffb91f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&auto=format&fit=crop&q=80'
      ];

    -- ── 2. Beach / Ocean / Maldives / Island ─────────────────
    ELSIF n LIKE '%beach%' OR n LIKE '%bay%'    OR n LIKE '%ocean%'
       OR n LIKE '%sea%'   OR n LIKE '%marina%' OR n LIKE '%coral%'
       OR n LIKE '%island%' OR n LIKE '%lagoon%' OR n LIKE '%cove%'
       OR h.ct IN ('maldives','phuket','bali','cancun','miami','seychelles')
    THEN
      -- Real photos: Maldives W Hotel overwater villa, wooden overwater bungalow,
      --              beachside hotel palms, tropical coastline, beach resort aerial
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1602002418209-55d7a55adf42?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1743521715435-e724474813b2?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1778090887585-b27fae5b6f03?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=1200&auto=format&fit=crop&q=80'
      ];

    -- ── 3. Palace / Royal / Heritage / Grand / Castle ─────────
    ELSIF n LIKE '%palace%'   OR n LIKE '%royal%'   OR n LIKE '%imperial%'
       OR n LIKE '%grand%'    OR n LIKE '%heritage%' OR n LIKE '%manor%'
       OR n LIKE '%castle%'   OR n LIKE '%chateau%'  OR n LIKE '%historic%'
    THEN
      -- Real photos: Atlantis Dubai ornate lobby, sunlit grand lobby,
      --              designer wood-wall lobby, elegant hotel hallway, luxury bed linen
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1759177715489-74112089de1a?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1742844552193-2fd3425cd26d?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1621293954908-907159247fc8?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1495365200479-c4ed1d35e1aa?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&auto=format&fit=crop&q=80'
      ];

    -- ── 4. Mountain / Alpine / Lodge / Ski ────────────────────
    ELSIF n LIKE '%mountain%' OR n LIKE '%alpine%' OR n LIKE '%peak%'
       OR n LIKE '%lodge%'    OR n LIKE '%chalet%' OR n LIKE '%cabin%'
       OR n LIKE '%glacier%'  OR n LIKE '%ski%'    OR n LIKE '%summit%'
    THEN
      -- Real photos: night ski resort in mountains, mansion beside snow mountain,
      --              sunloungers mountain resort, snow peaks clear sky, alpine chalet
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1706794543262-a013701e070c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485541653056-e688bdf8319e?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1742222168686-55ec5ffd3c81?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1684262206285-f853809d7473?w=1200&auto=format&fit=crop&q=80'
      ];

    -- ── 5. City / Urban (by city name or keyword) ─────────────
    ELSIF h.ct IN ('new york','london','paris','tokyo','singapore',
                   'hong kong','sydney','amsterdam','barcelona','rome',
                   'berlin','istanbul','bangkok','seoul','new york city')
       OR n LIKE '%city%'     OR n LIKE '%urban%'   OR n LIKE '%metro%'
       OR n LIKE '%downtown%' OR n LIKE '%skyline%' OR n LIKE '%tower%'
    THEN
      -- Real photos: hotel room city window view, large window city panorama,
      --              hotel building lit at night, rooftop pool aerial, resort pool city
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1755613708939-d572099433ab?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1688933758128-83d40ab10b4e?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1711743266323-5badf42d4797?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523496922380-91d5afba98a3?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1549294413-26f195200c16?w=1200&auto=format&fit=crop&q=80'
      ];

    -- ── 6. Generic luxury fallback ────────────────────────────
    ELSE
      -- Real photos: Bab Al Shams pool, elegant suite, luxury bed,
      --              hotel pool umbrellas, sunlit grand lobby
      imgs := ARRAY[
        'https://images.unsplash.com/photo-1682879654264-5f2a52e1ea0f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1716667282993-cd8f2bffb91f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1742844552193-2fd3425cd26d?w=1200&auto=format&fit=crop&q=80'
      ];
    END IF;

    -- Fill only the missing slots; preserve existing images untouched.
    FOR i IN (img_count + 1)..5 LOOP
      INSERT INTO hotel_images (hotel_id, image_url, sort_order)
      VALUES (h.id, imgs[i], max_ord + (i - img_count));
    END LOOP;

  END LOOP;
END $$;

-- ============================================================
-- END OF MIGRATION 026
-- ============================================================
