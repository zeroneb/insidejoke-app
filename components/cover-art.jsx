// Cover art shared by list tiles and list headers. No data access, safe anywhere.

export function Cake({ style = { right: 8, bottom: 44 }, w = 96, h = 104, sparkle = false }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={w} height={h} viewBox="0 0 120 140" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 128 C40 132 82 132 104 127" />
      <path d="M24 126 C23 112 24 100 26 88 C48 84 76 84 98 87 C100 100 100 113 99 126" />
      <path d="M30 86 C30 77 31 70 33 64 C50 60 72 60 90 63 C92 71 92 79 92 86" />
      <path d="M26 92 C34 98 40 92 46 98 C52 104 58 96 64 101 C70 106 78 97 84 102 C90 106 96 99 99 95" strokeWidth="2" />
      <path d="M33 70 C40 75 46 69 52 74 C58 79 64 71 70 76 C76 80 84 72 91 76" strokeWidth="2" />
      <path d="M34 108 L40 122 M46 108 L52 122 M58 108 L64 122 M70 108 L76 122 M82 108 L88 122" strokeWidth="1.6" />
      <path d="M46 60 L45 42 M61 59 L61 38 M76 60 L77 42" />
      <path d="M45 36 C41 31 44 26 45 22 C48 27 50 31 45 36 Z M61 32 C57 27 60 21 61 17 C64 22 66 27 61 32 Z M77 36 C73 31 76 26 77 22 C80 27 82 31 77 36 Z" strokeWidth="2" />
      {sparkle ? <path d="M14 40 L20 46 M20 40 L14 46 M102 24 L106 34 M98 30 L110 28 M96 52 L100 56" strokeWidth="1.8" /> : null}
    </svg>
  );
}

export function Bouquet({ ink = '#FFFFFF', style = { right: 10, bottom: 44 }, w = 88, h = 112, sparkle = false }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={w} height={h} viewBox="0 0 110 150" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 92 C29 108 31 128 34 142 C48 145 64 145 76 141 C80 126 81 108 79 92 C64 89 44 89 30 92 Z" />
      <path d="M27 91 C44 85 66 84 83 89" strokeWidth="1.8" />
      <path d="M36 110 L75 108 M37 122 L75 121 M38 133 L73 133 M47 95 L48 141 M61 94 L62 142" strokeWidth="1.6" />
      <path d="M50 90 C48 70 44 55 36 42 M56 90 C57 68 60 50 70 36 M53 90 C53 70 54 54 54 32" />
      <path d="M28 42 C23 30 30 21 36 26 C40 19 47 23 45 33 C43 42 33 47 28 42 Z" />
      <path d="M64 37 C61 25 69 18 74 24 C80 19 85 28 81 36 C77 43 67 43 64 37 Z" />
      <path d="M48 31 C45 18 52 11 56 16 C60 11 65 18 62 28 C60 35 51 36 48 31 Z" />
      <path d="M50 74 C40 68 35 59 37 54 C46 55 51 64 50 74 M57 67 C66 60 73 57 76 60 C71 67 62 69 57 67" />
      {sparkle ? <path d="M88 14 L92 22 M98 22 L90 26 M86 28 L90 26" strokeWidth="1.8" /> : null}
    </svg>
  );
}


// A cover photo framed in the cover's own shape: a circle, or a diamond on treat lists.
// The shape keeps its color behind the photo, so it still reads as the cover's art while it loads.
export function PhotoShape({ src, shape = 'circle', size, color, style, className }) {
  if (shape === 'diamond') {
    return (
      <div aria-hidden="true" className={className} style={{ position: 'absolute', width: size, height: size, background: color, transform: 'rotate(45deg)', overflow: 'hidden', ...style }}>
        <img src={src} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', left: '-21%', top: '-21%', width: '142%', height: '142%', objectFit: 'cover', transform: 'rotate(-45deg)', display: 'block' }} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={className} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: color, overflow: 'hidden', ...style }}>
      <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}

// The list's own cover art behind the header (matches its tile).
export function CoverArt({ cv }) {
  const p = cv.photo;
  if (cv.art === 'diamond') {
    // The photo stays still inside the diamond (a spinning photo is hard to look at).
    if (p) return <PhotoShape src={p} shape="diamond" size={200} color={cv.dia} style={{ right: -30, bottom: -40 }} />;
    return <div aria-hidden="true" className="spinslow" style={{ position: 'absolute', right: -30, bottom: -40, width: 200, height: 200, background: cv.dia, transform: 'rotate(45deg)' }} />;
  }
  if (cv.art === 'cake') return (<>
    {p ? <PhotoShape src={p} size={260} color={cv.orb} className="breathe" style={{ right: -80, bottom: -90 }} />
      : <div aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -80, bottom: -90, width: 260, height: 260, borderRadius: '50%', background: cv.orb }} />}
    <Cake style={{ right: 14, bottom: 22 }} w={120} h={140} sparkle />
  </>);
  if (cv.art === 'bouquet') return (<>
    {p ? <PhotoShape src={p} size={260} color={cv.blob} className="breathe" style={{ right: -80, bottom: -90 }} /> : null}
    <Bouquet ink={cv.title} style={{ right: 6, bottom: 10 }} w={130} h={176} sparkle />
  </>);
  // Slightly smaller than the plain circle and still, so the ring of words sits clear of the photo.
  if (p) return <PhotoShape src={p} size={236} color={cv.circle} style={{ right: -58, bottom: -68 }} />;
  return <div aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: cv.circle }} />;
}

