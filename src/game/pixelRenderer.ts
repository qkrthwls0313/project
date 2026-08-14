export type PixelFloor = "1F" | "2F" | "B1F" | "B2F" | "B3F";
export type PixelDirection = "up" | "down" | "left" | "right";
export type OpeningVisual = "room" | "tv" | "phone" | "school";

type Point = { x: number; y: number };
const TILE = 16;

function box(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  edge: string,
  fill: string,
  hi?: string,
) {
  box(ctx, edge, x, y, w, h);
  box(ctx, fill, x + 1, y + 1, w - 2, h - 2);
  if (hi) {
    box(ctx, hi, x + 2, y + 2, w - 4, 1);
    box(ctx, hi, x + 2, y + 2, 1, h - 4);
  }
}

function dither(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  gap = 4,
) {
  for (let py = y; py < y + h; py += gap)
    for (let px = x + ((py / gap) % 2) * 2; px < x + w; px += gap)
      box(ctx, color, px, py, 1, 1);
}

function floorTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  floor: PixelFloor,
) {
  const underground = floor.startsWith("B");
  const base = underground
    ? floor === "B3F"
      ? "#392025"
      : "#383039"
    : "#806b55";
  outline(
    ctx,
    x,
    y,
    TILE,
    TILE,
    underground ? "#17141a" : "#493d34",
    base,
    underground ? "#51404a" : "#a28a68",
  );
  box(ctx, underground ? "#261b25" : "#675442", x + 3, y + 8, 8, 1);
  if ((x / TILE + y / TILE) % 3 === 0)
    box(ctx, underground ? "#6e2635" : "#b39a74", x + 12, y + 3, 1, 1);
}

function wallTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  floor: PixelFloor,
) {
  const dark = floor.startsWith("B");
  outline(
    ctx,
    x,
    y,
    TILE,
    TILE,
    "#14131a",
    dark ? "#352936" : "#5f5264",
    dark ? "#4e3a49" : "#82718a",
  );
  box(ctx, dark ? "#251b25" : "#433849", x + 2, y + 11, 12, 2);
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wide = 64,
) {
  outline(ctx, x, y, wide, 28, "#231923", "#744731", "#a66c43");
  box(ctx, "#3b2524", x + 5, y + 28, 7, 18);
  box(ctx, "#3b2524", x + wide - 12, y + 28, 7, 18);
  box(ctx, "#d6c38b", x + 10, y + 5, 18, 12);
  box(ctx, "#806b9a", x + 12, y + 7, 14, 1);
}

function drawShelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  horror = false,
) {
  outline(
    ctx,
    x,
    y,
    80,
    64,
    "#201820",
    horror ? "#46252e" : "#634831",
    horror ? "#733343" : "#926b45",
  );
  for (let row = 0; row < 3; row++) {
    box(ctx, "#251b20", x + 5, y + 17 + row * 18, 70, 3);
    for (let i = 0; i < 8; i++) {
      const colors = horror
        ? ["#6c132d", "#2b2029", "#9c2439"]
        : ["#b54b52", "#d0a74f", "#4e7b86", "#725b96"];
      box(
        ctx,
        colors[(i + row) % colors.length],
        x + 7 + i * 8,
        y + 5 + row * 18,
        5,
        12,
      );
      box(ctx, "#ead8a7", x + 8 + i * 8, y + 6 + row * 18, 3, 1);
    }
  }
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  locked = false,
) {
  outline(
    ctx,
    x,
    y,
    48,
    72,
    "#17141b",
    locked ? "#3a2930" : "#5d3d31",
    locked ? "#59404b" : "#885b3e",
  );
  box(ctx, "#281d22", x + 7, y + 8, 34, 23);
  box(ctx, "#281d22", x + 7, y + 37, 34, 25);
  box(ctx, "#c69b43", x + 36, y + 34, 4, 4);
  if (locked) {
    box(ctx, "#ada69b", x + 13, y + 30, 25, 3);
    box(ctx, "#69656b", x + 22, y + 24, 8, 14);
  }
}

function drawEasel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bloody = false,
) {
  box(ctx, "#3a271d", x + 23, y + 4, 5, 71);
  box(ctx, "#3a271d", x + 7, y + 61, 42, 5);
  outline(
    ctx,
    x + 5,
    y + 8,
    46,
    43,
    "#28191a",
    bloody ? "#6f2535" : "#d3c49e",
    bloody ? "#b54553" : "#efe2bf",
  );
  if (bloody) {
    dither(ctx, x + 9, y + 12, 38, 34, "#c4143b", 3);
    box(ctx, "#18060d", x + 20, y + 23, 17, 7);
    box(ctx, "#ead6c0", x + 23, y + 24, 11, 4);
  } else {
    box(ctx, "#638a7c", x + 9, y + 31, 38, 15);
    box(ctx, "#78649c", x + 12, y + 22, 12, 9);
    box(ctx, "#e3b55b", x + 31, y + 15, 7, 7);
  }
  box(ctx, "#563522", x + 10, y + 66, 5, 14);
  box(ctx, "#563522", x + 41, y + 66, 5, 14);
}

function drawDistillery(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const colors = [
    "#c52642",
    "#d78e29",
    "#d7c638",
    "#3e9c62",
    "#3985b8",
    "#5559a6",
    "#8947a8",
  ];
  colors.forEach((c, i) => {
    const px = x + i * 24;
    outline(ctx, px, y, 18, 48, "#15141b", "#a8b7b8", "#e2e8dc");
    box(ctx, c, px + 3, y + 19, 12, 25);
    box(ctx, "#f5d8d255", px + 5, y + 23, 3, 13);
    box(ctx, "#6e2532", px + 6, y + 8, 6, 10);
  });
  box(ctx, "#52404b", x - 5, y + 48, 174, 7);
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  p: Point,
  dir: PixelDirection,
  frame: number,
  villain = false,
) {
  const stride = frame % 3 === 1 ? -2 : frame % 3 === 2 ? 2 : 0;
  const bob = stride ? -1 : 0;
  const x = Math.round(p.x - 24), y = Math.round(p.y - 62 + bob);
  const edge = "#0c0a12", skin = villain ? "#bca79e" : "#e8b39f";
  const hair = villain ? "#ddd8cf" : "#6fa8c9";
  const hairDark = villain ? "#7e7882" : "#345b7f";
  const hairLight = villain ? "#fff4df" : "#bce0ec";
  const coat = villain ? "#29242f" : "#523d70";
  box(ctx, "#00000088", x + 8, y + 59, 34, 5);
  // 48x64 premium SD silhouette: head occupies over half the sprite.
  box(ctx, edge, x + 12, y + 1, 24, 2);
  box(ctx, edge, x + 7, y + 3, 34, 4);
  box(ctx, edge, x + 4, y + 7, 40, 23);
  box(ctx, edge, x + 7, y + 30, 34, 6);
  box(ctx, skin, x + 9, y + 10, 30, 21);
  box(ctx, "#f7cab7", x + 12, y + 11, 21, 4);
  if (dir === "up") {
    box(ctx, hair, x + 8, y + 5, 32, 27);
    box(ctx, hairDark, x + 8, y + 24, 32, 9);
    box(ctx, hairLight, x + 13, y + 7, 16, 4);
    box(ctx, hairDark, x + 6, y + 14, 5, 15);
    box(ctx, hairDark, x + 37, y + 13, 5, 16);
  } else {
    box(ctx, hair, x + 9, y + 4, 30, 7);
    box(ctx, hair, x + 5, y + 9, 10, 22);
    box(ctx, hair, x + 34, y + 9, 9, 22);
    box(ctx, hairDark, x + 5, y + 23, 9, 9);
    box(ctx, hairDark, x + 35, y + 22, 8, 10);
    box(ctx, hairLight, x + 14, y + 6, 15, 3);
    box(ctx, hair, x + 13, y + 9, 20, 6);
    box(ctx, hairDark, x + 13, y + 13, 5, 5);
    const gaze = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    box(ctx, edge, x + 12 + gaze, y + 19, 8, 7);
    box(ctx, edge, x + 29 + gaze, y + 19, 8, 7);
    box(ctx, "#f9f2e8", x + 13 + gaze, y + 20, 6, 5);
    box(ctx, "#f9f2e8", x + 30 + gaze, y + 20, 6, 5);
    box(ctx, villain ? "#c51c3d" : "#43345d", x + 16 + gaze, y + 21, 3, 4);
    box(ctx, villain ? "#c51c3d" : "#43345d", x + 33 + gaze, y + 21, 3, 4);
    box(ctx, "#ffffff", x + 17 + gaze, y + 21, 1, 1);
    box(ctx, "#ffffff", x + 34 + gaze, y + 21, 1, 1);
    box(ctx, "#b45c70", x + 10, y + 28, 4, 2);
    box(ctx, "#b45c70", x + 36, y + 28, 3, 2);
    box(ctx, "#9b4d5c", x + 22, y + 30, 6, 2);
    if (!villain) {
      box(ctx, "#e4bd47", x + 38, y + 10, 6, 3);
      box(ctx, "#f7dc70", x + 41, y + 7, 3, 8);
    }
  }
  box(ctx, edge, x + 5, y + 39, 7, 14);
  box(ctx, edge, x + 36, y + 39, 7, 14);
  box(ctx, coat, x + 7, y + 40 + (dir === "left" ? stride : 0), 5, 11);
  box(ctx, coat, x + 36, y + 40 + (dir === "right" ? stride : 0), 5, 11);
  box(ctx, skin, x + 7, y + 50, 5, 4);
  box(ctx, skin, x + 36, y + 50, 5, 4);
  outline(ctx, x + 12, y + 35, 24, 20, edge, coat, villain ? "#55485d" : "#806aa0");
  box(ctx, "#e9e2ee", x + 16, y + 36, 16, 5);
  box(ctx, villain ? "#b51938" : "#e4bd47", x + 23, y + 37, 3, 14);
  box(ctx, "#2e2440", x + 15, y + 51, 18, 6);
  box(ctx, edge, x + 12 + stride, y + 54, 10, 8);
  box(ctx, edge, x + 27 - stride, y + 54, 10, 8);
  box(ctx, villain ? "#5e5665" : "#d8cabb", x + 13 + stride, y + 59, 10, 3);
  box(ctx, villain ? "#5e5665" : "#d8cabb", x + 26 - stride, y + 59, 10, 3);
  if (villain) {
    box(ctx, "#781129", x + 10, y + 27, 4, 6);
    box(ctx, "#b9a378", x + 43, y + 39, 3, 25);
    box(ctx, "#d7d2c5", x + 40, y + 55, 7, 9);
  }
}

function pixelLighting(
  ctx: CanvasRenderingContext2D,
  player: Point,
  dir: PixelDirection,
  enabled: boolean,
  battery: number,
  time: number,
) {
  const vectors: Record<PixelDirection, Point> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const facing = vectors[dir];
  const flicker = battery < 20 && Math.floor(time / 90) % 7 === 0 ? 36 : 0;
  const range = (battery < 20 ? 124 : 190) - flicker;
  ctx.save();
  for (let y = 0; y < 432; y += TILE)
    for (let x = 0; x < 768; x += TILE) {
      const dx = x + 8 - player.x, dy = y + 8 - player.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const alignment = (dx * facing.x + dy * facing.y) / d;
      const nearGlow = d < 26;
      const inCone = enabled && d < range && alignment > 0.68;
      const inCore = inCone && alignment > 0.9 && d < range * 0.78;
      if (!nearGlow && !inCone)
        box(ctx, d > range + 70 ? "#020208f2" : "#03040acb", x, y, TILE, TILE);
      else if (!inCore && (x / TILE + y / TILE) % 2 === 0)
        box(ctx, "#08081762", x, y, TILE, TILE);
      else if (inCone && d > range * 0.78)
        box(ctx, "#0808173d", x, y, TILE, TILE);
    }
  ctx.restore();
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  floor: PixelFloor,
  player: Point & { dir: PixelDirection },
  enemy: Point,
  light: boolean,
  battery: number,
  time: number,
  horror: boolean,
) {
  ctx.imageSmoothingEnabled = false;
  box(ctx, "#090a12", 0, 0, 768, 432);
  for (let y = 48; y < 400; y += TILE)
    for (let x = 48; x < 720; x += TILE) floorTile(ctx, x, y, floor);
  for (let x = 32; x < 736; x += TILE) {
    wallTile(ctx, x, 32, floor);
    wallTile(ctx, x, 400, floor);
  }
  for (let y = 48; y < 400; y += TILE) {
    wallTile(ctx, 32, y, floor);
    wallTile(ctx, 720, y, floor);
  }
  drawShelf(ctx, 58, 72, horror);
  drawTable(ctx, 292, 78, 176);
  drawDoor(ctx, 650, 294, floor.startsWith("B"));
  if (floor === "1F") {
    drawEasel(ctx, 590, 72);
    drawTable(ctx, 90, 288, 94);
  }
  if (floor === "2F") {
    drawShelf(ctx, 584, 72);
    drawEasel(ctx, 350, 76);
  }
  if (floor === "B1F") {
    drawEasel(ctx, 348, 67, true);
    drawDistillery(ctx, 531, 92);
  }
  if (floor === "B2F") {
    for (let i = 0; i < 4; i++) drawDoor(ctx, 190 + i * 82, 64, true);
    drawShelf(ctx, 588, 72, true);
  }
  if (floor === "B3F") {
    drawDistillery(ctx, 514, 72);
    drawEasel(ctx, 350, 70, true);
  }
  const movingFrame = Math.floor(time / 150) % 3;
  if (horror)
    drawCharacter(ctx, enemy, "down", Math.floor(time / 120) % 3, true);
  pixelLighting(ctx, player, player.dir, light && battery > 0, battery, time);
  // The player is composited after darkness so the flashlight mask never hides Yuna.
  drawCharacter(ctx, player, player.dir, movingFrame);
  box(ctx, "#080912dd", 48, 48, 72, 24);
  ctx.fillStyle = "#f1dfbd";
  ctx.font = "bold 14px monospace";
  ctx.fillText(floor, 58, 65);
}

function drawRain(ctx: CanvasRenderingContext2D, frame: number) {
  for (let i = 0; i < 48; i++) {
    const x = ((i * 29 + frame * 5) % 340) - 10,
      y = ((i * 43 + frame * 11) % 200) - 10;
    box(ctx, i % 3 ? "#7398b1" : "#b3d1dc", x, y, 1, 5);
    box(ctx, "#3f6177", x + 1, y + 5, 1, 2);
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, frame: number, tv: boolean) {
  box(ctx, "#121422", 0, 0, 320, 124);
  box(ctx, "#2d222c", 0, 124, 320, 56);
  dither(ctx, 0, 124, 320, 56, "#503943", 4);
  for (let y = 8; y < 120; y += 12) {
    box(ctx, "#252437", 0, y, 320, 1);
    for (let x = (y / 12) % 2 ? 5 : 12; x < 320; x += 24)
      box(ctx, "#36334a", x, y + 3, 1, 4);
  }
  outline(ctx, 22, 18, 105, 76, "#17131d", "#31455e", "#6b7588");
  box(ctx, "#201925", 72, 19, 5, 74);
  box(ctx, "#201925", 23, 55, 103, 5);
  box(ctx, "#d17d37", 27, 23, 37, 5);
  dither(ctx, 28, 29, 94, 58, "#8aa5b8", 5);
  outline(ctx, 192, 128, 110, 27, "#1c1720", "#50384d", "#735168");
  outline(ctx, 250, 115, 38, 17, "#251b25", "#cbb69f", "#efe1c8");
  drawEasel(ctx, 141, 48);
  drawTable(ctx, 25, 132, 90);
  outline(ctx, 274, 58, 28, 53, "#1a151e", "#493748", "#71566c");
  box(ctx, "#d8aa42", 281, 64, 12, 12);
  dither(ctx, 278, 61, 19, 20, "#e9c967", 3);
  box(ctx, "#352431", 286, 80, 3, 30);
  if (tv) {
    outline(ctx, 103, 30, 150, 91, "#10121a", "#4c7a8f", "#8ec8d2");
    for (let i = 0; i < 140; i++)
      box(
        ctx,
        i % 3 ? "#d4edef" : "#315d71",
        109 + ((i * 37 + frame * 9) % 138),
        37 + ((i * 19) % 75),
        2,
        2,
      );
    box(ctx, "#a91633", 128, 49, 100, 16);
    box(ctx, "#eef2dc", 134, 54, 64, 2);
    box(ctx, "#09121b", 120, 85, 116, 14);
  } else drawCharacter(ctx, { x: 218, y: 133 }, "down", frame % 3);
  drawRain(ctx, frame);
}

function drawPhone(ctx: CanvasRenderingContext2D, frame: number) {
  box(ctx, "#170810", 0, 0, 320, 180);
  dither(ctx, 0, 0, 320, 180, "#3d1320", 5);
  outline(
    ctx,
    102 + (frame % 2),
    10,
    116,
    166,
    "#0c0c12",
    "#261322",
    "#594052",
  );
  box(ctx, "#0d0c12", 142, 14, 36, 7);
  box(ctx, "#ead9d0", 118, 37, 61, 3);
  box(ctx, "#8f1230", 116, 58, 88, 35);
  box(ctx, "#c51f43", 116, 102, 88, 38);
  dither(ctx, 120, 62, 80, 27, "#e68a98", 4);
  box(ctx, "#f8d9de", 125, 70, 52, 2);
  box(ctx, "#f8d9de", 125, 78, 65, 2);
  box(ctx, "#ffd8dc", 125, 114, 70, 2);
  box(ctx, "#ffd8dc", 125, 122, 51, 2);
  box(ctx, "#8d0b2b", 145, 150, 30, 8);
}

function drawSchool(ctx: CanvasRenderingContext2D, frame: number) {
  box(ctx, "#07101b", 0, 0, 320, 126);
  box(ctx, "#151b22", 0, 126, 320, 54);
  dither(ctx, 0, 126, 320, 54, "#2d3d46", 4);
  outline(ctx, 48, 17, 224, 131, "#070b11", "#24303a", "#394956");
  outline(ctx, 102, 29, 116, 20, "#15141a", "#d1c39e", "#f0dfb5");
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 5; col++) {
      outline(
        ctx,
        65 + col * 40,
        61 + row * 38,
        25,
        27,
        "#090d13",
        col === 2 && row === 1 ? "#62152a" : "#111923",
        "#263a4b",
      );
    }
  box(ctx, "#b20b31", 136, 137, 50, 8);
  dither(ctx, 136, 137, 50, 8, "#f32652", 3);
  outline(ctx, 246, 95, 22, 53, "#05080c", "#11161d", "#293541");
  drawCharacter(ctx, { x: 82, y: 160 }, "up", frame % 3);
  box(ctx, "#242d35", 0, 145, 320, 4);
  for (let i = 0; i < 10; i++) {
    box(ctx, "#34434d", i * 37 - 8, 137, 3, 43);
    box(ctx, "#34434d", i * 37 - 8, 148, 27, 3);
  }
  drawRain(ctx, frame);
  if (frame % 18 === 0) box(ctx, "#dce9e9", 0, 0, 320, 180);
}

export function renderOpening(
  ctx: CanvasRenderingContext2D,
  kind: OpeningVisual,
  time: number,
) {
  ctx.imageSmoothingEnabled = false;
  const frame = Math.floor(time / 160);
  box(ctx, "#05060b", 0, 0, 320, 180);
  if (kind === "room" || kind === "tv") drawRoom(ctx, frame, kind === "tv");
  else if (kind === "phone") drawPhone(ctx, frame);
  else drawSchool(ctx, frame);
}

export function renderTitle(ctx: CanvasRenderingContext2D, time: number) {
  ctx.imageSmoothingEnabled = false;
  const frame = Math.floor(time / 170);
  box(ctx, "#070610", 0, 0, 768, 432);
  // Crooked academy façade and bruised night sky.
  for (let y = 0; y < 176; y += 8)
    for (let x = 0; x < 768; x += 8)
      if ((x / 8 + y / 8) % 5 === 0) box(ctx, "#11152a", x, y, 8, 8);
  box(ctx, "#10131d", 102, 78, 564, 310);
  box(ctx, "#211827", 112, 88, 544, 300);
  for (let y = 96; y < 370; y += 16)
    for (let x = 120 + ((y / 16) % 2) * 8; x < 648; x += 32)
      box(ctx, (x + y) % 64 ? "#342430" : "#482936", x, y, 22, 10);
  box(ctx, "#09080e", 264, 48, 240, 48);
  box(ctx, "#e3d5b1", 280, 59, 208, 5);
  box(ctx, "#8c1733", 292, 72, 184, 7);
  // Windows intermittently resemble blinking eyes.
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
    const wx = 142 + col * 100, wy = 128 + row * 92;
    outline(ctx, wx, wy, 50, 54, "#09070d", "#161523", "#3b3043");
    box(ctx, "#09070d", wx + 24, wy + 2, 3, 50);
    if ((col + row + Math.floor(frame / 9)) % 4 === 0) {
      box(ctx, "#bc2142", wx + 9, wy + 24, 13, 3);
      box(ctx, "#bc2142", wx + 29, wy + 24, 13, 3);
      box(ctx, "#f1b44c", wx + 15, wy + 24, 2, 2);
      box(ctx, "#f1b44c", wx + 35, wy + 24, 2, 2);
    }
  }
  outline(ctx, 324, 270, 120, 118, "#07060b", "#130f18", "#503047");
  box(ctx, "#8f1530", 328, 376, 112, 12);
  for (let i = 0; i < 7; i++) {
    const drip = 5 + ((i * 9 + frame) % 18);
    box(ctx, "#a41634", 338 + i * 15, 386, 5, drip);
  }
  // Childlike rainbow paint marks become increasingly wrong toward the door.
  const rainbow = ["#e96473", "#e7ad47", "#d8d159", "#69a66a", "#5590b8", "#795d9f"];
  rainbow.forEach((c, i) => box(ctx, c, 72 + i * 12, 340 - i * 3, 10, 56 + i * 3));
  for (let i = 0; i < 28; i++) {
    const rx = (i * 47 + frame * 4) % 768, ry = (i * 71 + frame * 9) % 432;
    box(ctx, i % 3 ? "#4f718b" : "#9bb5c5", rx, ry, 2, 8);
  }
  // A faceless director remains embedded in the building; the hero portrait is
  // composited separately at title resolution rather than reusing a map sprite.
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.translate(520, 264);
  ctx.scale(1.55, 1.55);
  drawCharacter(ctx, { x: 0, y: 68 }, "down", 0, true);
  ctx.restore();
  if (frame % 37 === 0) box(ctx, "#f3e8d61f", 0, 0, 768, 432);
}
