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
  const x = Math.round(p.x - 16),
    y = Math.round(p.y - 42),
    step = frame % 3 === 1 ? -1 : frame % 3 === 2 ? 1 : 0;
  const edge = "#17131c",
    skin = villain ? "#c8b8a7" : "#dca997",
    hair = villain ? "#d5d0c5" : "#79a9c4",
    coat = villain ? "#292433" : "#55446f";
  box(ctx, "#00000055", x + 7, y + 41, 19, 4);
  box(ctx, edge, x + 9, y + 3, 15, 2);
  box(ctx, edge, x + 6, y + 5, 21, 12);
  box(ctx, edge, x + 8, y + 17, 17, 6);
  box(ctx, skin, x + 8, y + 8, 17, 10);
  box(ctx, skin, x + 10, y + 18, 13, 3);
  box(ctx, "#efc1aa", x + 10, y + 9, 12, 2);
  if (dir === "up") {
    box(ctx, hair, x + 8, y + 5, 17, 13);
    box(ctx, "#4c7895", x + 9, y + 16, 15, 5);
    box(ctx, "#b8d1dc", x + 11, y + 6, 8, 2);
  } else {
    box(ctx, hair, x + 9, y + 4, 15, 4);
    box(ctx, hair, x + 7, y + 8, 5, 13);
    box(ctx, hair, x + 22, y + 8, 4, 13);
    box(ctx, "#4c7895", x + 7, y + 15, 4, 5);
    box(ctx, "#4c7895", x + 22, y + 15, 4, 5);
    box(ctx, "#b8d1dc", x + 11, y + 5, 8, 2);
    box(ctx, "#3f3349", x + 12, y + 13, 2, 2);
    box(ctx, "#3f3349", x + 19, y + 13, 2, 2);
    box(ctx, "#a85b65", x + 15, y + 18, 4, 1);
  }
  box(ctx, edge, x + 6, y + 23, 4, 12);
  box(ctx, edge, x + 24, y + 23, 4, 12);
  box(ctx, skin, x + 7, y + 32, 3, 4);
  box(ctx, skin, x + 24, y + 32, 3, 4);
  outline(
    ctx,
    x + 9,
    y + 22,
    16,
    16,
    edge,
    coat,
    villain ? "#55485d" : "#796397",
  );
  box(ctx, villain ? "#b51938" : "#d4b339", x + 15, y + 22, 3, 10);
  box(ctx, edge, x + 9 + step, y + 37, 6, 6);
  box(ctx, edge, x + 19 - step, y + 37, 6, 6);
  box(ctx, "#ddd0be", x + 10 + step, y + 41, 6, 2);
  box(ctx, "#ddd0be", x + 18 - step, y + 41, 6, 2);
  if (villain) {
    box(ctx, "#c61b3b", x + 12, y + 13, 2, 2);
    box(ctx, "#c61b3b", x + 19, y + 13, 2, 2);
    box(ctx, "#b9a378", x + 26, y + 22, 3, 24);
    box(ctx, "#d7d2c5", x + 25, y + 39, 5, 7);
  }
}

function pixelLighting(
  ctx: CanvasRenderingContext2D,
  player: Point,
  enabled: boolean,
  battery: number,
) {
  ctx.save();
  for (let y = 0; y < 432; y += TILE)
    for (let x = 0; x < 768; x += TILE) {
      const d = Math.hypot(x + 8 - player.x, y + 8 - player.y);
      const radius = battery < 20 ? 112 : 160;
      if (!enabled || d > radius)
        box(ctx, d > radius + 80 ? "#020208ee" : "#03040ab8", x, y, TILE, TILE);
      else if (d > radius * 0.72 && (x / TILE + y / TILE) % 2 === 0)
        box(ctx, "#05050a55", x, y, TILE, TILE);
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
  drawCharacter(ctx, player, player.dir, movingFrame);
  if (horror)
    drawCharacter(ctx, enemy, "down", Math.floor(time / 120) % 3, true);
  pixelLighting(ctx, player, light && battery > 0, battery);
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
