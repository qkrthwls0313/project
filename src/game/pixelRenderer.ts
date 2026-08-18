export type PixelFloor = "1F" | "2F" | "B1F" | "B2F" | "B3F";
export type PixelDirection = "up" | "down" | "left" | "right";
export type OpeningVisual = "room" | "tv" | "phone" | "school";

type Point = { x: number; y: number };
const TILE = 16;
let yunaSheet: HTMLCanvasElement | null = null;
let yunaSheetLoading = false;
let castSheetImage: HTMLImageElement | null = null;
let roomBackgroundImage: HTMLImageElement | null = null;

function getYunaSheet() {
  if (yunaSheet || yunaSheetLoading || typeof window === "undefined") return yunaSheet;
  yunaSheetLoading = true;
  const image = new Image();
  image.src = "/assets/sprites/yuna-walk-source.png";
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue = new Int32Array(canvas.width * canvas.height);
    let head = 0, tail = 0;
    const isBackdrop = (index: number) => {
      const offset = index * 4, r = data[offset], g = data[offset + 1], b = data[offset + 2];
      return r > 226 && g > 192 && b > 202 && r > g && Math.abs(r - b) < 42;
    };
    const enqueue = (index: number) => {
      if (!visited[index] && isBackdrop(index)) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    };
    for (let x = 0; x < canvas.width; x++) {
      enqueue(x); enqueue((canvas.height - 1) * canvas.width + x);
    }
    for (let y = 0; y < canvas.height; y++) {
      enqueue(y * canvas.width); enqueue(y * canvas.width + canvas.width - 1);
    }
    while (head < tail) {
      const index = queue[head++], x = index % canvas.width, y = Math.floor(index / canvas.width);
      data[index * 4 + 3] = 0;
      if (x > 0) enqueue(index - 1);
      if (x + 1 < canvas.width) enqueue(index + 1);
      if (y > 0) enqueue(index - canvas.width);
      if (y + 1 < canvas.height) enqueue(index + canvas.width);
    }
    context.putImageData(pixels, 0, 0);
    yunaSheet = canvas;
  };
  return null;
}

function getCastSheet() {
  if (castSheetImage)
    return castSheetImage.complete && castSheetImage.naturalWidth ? castSheetImage : null;
  if (typeof window === "undefined") return null;
  const image = new Image();
  image.src = "/assets/portraits/cast-emotions.png";
  image.onload = () => { castSheetImage = image; };
  castSheetImage = image;
  return image.complete ? image : null;
}

function getRoomBackground() {
  if (roomBackgroundImage)
    return roomBackgroundImage.complete && roomBackgroundImage.naturalWidth
      ? roomBackgroundImage
      : null;
  if (typeof window === "undefined") return null;
  const image = new Image();
  image.src = "/assets/backgrounds/yuna-room-hd.png";
  image.onload = () => { roomBackgroundImage = image; };
  roomBackgroundImage = image;
  return image.complete ? image : null;
}

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

function drawFloorMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  direction: "up" | "down" | "exit",
  time: number,
) {
  const pulse = Math.floor(time / 360) % 2 === 0;
  outline(ctx, x, y, 70, 31, "#080a11", "#172534", pulse ? "#d5bd62" : "#6d6140");
  box(ctx, pulse ? "#d9bc55" : "#8f7b3d", x + 6, y + 6, 18, 18);
  ctx.fillStyle = "#10151c";
  ctx.font = "bold 13px monospace";
  ctx.fillText(direction === "exit" ? "E" : direction === "up" ? "▲" : "▼", x + 9, y + 20);
  ctx.fillStyle = pulse ? "#f5e9ad" : "#b6a86d";
  ctx.font = "bold 9px monospace";
  ctx.fillText(label, x + 29, y + 19);
  for (let i = 0; i < 3; i++) box(ctx, "#8da0a1", x + 7 + i * 4, y + 26 - i * 3, 12 + i * 3, 2);
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
  if (!villain) {
    const sheet = getYunaSheet();
    if (sheet) {
      const row = dir === "down" ? 0 : dir === "left" ? 1 : dir === "right" ? 2 : 3;
      const column = frame % 3;
      const sourceX = [215, 500, 775][column];
      const sourceY = [24, 323, 632, 925][row];
      box(ctx, "#00000088", p.x - 25, p.y - 6, 50, 7);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // Give the detailed walk sheet enough screen space to read like the cutscene art.
      ctx.drawImage(sheet, sourceX, sourceY, 250, 290, p.x - 39, p.y - 90, 78, 90);
      ctx.restore();
      return;
    }
  }
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
    if (dir === "left") {
      box(ctx, hair, x + 29, y + 15, 11, 13);
      box(ctx, hairDark, x + 35, y + 22, 7, 10);
      box(ctx, skin, x + 7, y + 24, 3, 4);
      box(ctx, edge, x + 6, y + 26, 3, 2);
    } else if (dir === "right") {
      box(ctx, hair, x + 8, y + 15, 11, 13);
      box(ctx, hairDark, x + 5, y + 22, 8, 10);
      box(ctx, skin, x + 39, y + 24, 3, 4);
      box(ctx, edge, x + 41, y + 26, 3, 2);
    }
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

function drawGuidePaper(
  ctx: CanvasRenderingContext2D,
  player: Point,
  time: number,
  promptOnly = false,
) {
  const x = 124, y = 337;
  const nearby = Math.hypot(player.x - (x + 15), player.y - (y + 10)) < 72;
  if (!promptOnly) {
    box(ctx, "#08060d99", x + 4, y + 5, 31, 20);
    box(ctx, "#2b2330", x - 2, y + 2, 34, 22);
    box(ctx, "#d8ccb1", x, y, 30, 19);
    box(ctx, "#f4e8c9", x + 2, y + 2, 25, 3);
    box(ctx, "#6f2738", x + 5, y + 7, 20, 2);
    box(ctx, "#594b4e", x + 5, y + 11, 17, 1);
    box(ctx, "#594b4e", x + 5, y + 14, 20, 1);
    box(ctx, "#a31d38", x + 22, y + 15, 5, 3);
    box(ctx, "#b7a889", x + 27, y, 3, 4);
    if (Math.floor(time / 280) % 2 === 0) {
      box(ctx, "#f7df77", x - 4, y + 6, 2, 2);
      box(ctx, "#f7df77", x + 34, y + 1, 2, 2);
      box(ctx, "#f7df77", x + 30, y + 23, 2, 2);
    }
  }
  if (promptOnly && nearby) {
    outline(ctx, x + 3, y - 22, 29, 18, "#09070d", "#34243c", "#d7bd70");
    ctx.fillStyle = "#ffe782";
    ctx.font = "bold 10px monospace";
    ctx.fillText("Z 조사", x + 5, y - 10);
    box(ctx, "#d7bd70", x + 15, y - 4, 4, 4);
  }
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
  guideRead: boolean,
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
    if (!guideRead) drawGuidePaper(ctx, player, time);
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
  if (floor === "1F") {
    drawFloorMarker(ctx, 356, 42, "2F 계단", "up", time);
    drawFloorMarker(ctx, 628, 258, "B1F", "down", time);
  } else if (floor === "2F") {
    drawFloorMarker(ctx, 52, 252, "1F", "down", time);
  } else if (floor === "B1F") {
    drawFloorMarker(ctx, 52, 252, "1F", "up", time);
  } else if (floor === "B2F") {
    drawFloorMarker(ctx, 628, 252, "B3F", "down", time);
  } else if (floor === "B3F") {
    drawFloorMarker(ctx, 52, 252, "EXIT", "exit", time);
  }
  const movingFrame = Math.floor(time / 150) % 3;
  if (horror)
    drawCharacter(ctx, enemy, "down", Math.floor(time / 120) % 3, true);
  pixelLighting(ctx, player, player.dir, light && battery > 0, battery, time);
  if (floor === "1F" && !guideRead) drawGuidePaper(ctx, player, time, true);
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
  // A lived-in bedroom: midnight-blue walls, warm wood and pools of amber light.
  box(ctx, "#102b43", 0, 0, 320, 121);
  dither(ctx, 0, 0, 320, 121, "#183a56", 7);
  box(ctx, "#244b62", 0, 116, 320, 5);
  box(ctx, "#173247", 0, 121, 320, 59);
  for (let y = 126; y < 180; y += 9) box(ctx, "#29495b", 0, y, 320, 2);
  for (let x = 0; x < 320; x += 32) box(ctx, "#102838", x, 122, 2, 58);

  // Window with thick wooden trim, rainy glass and a distant sleeping town.
  outline(ctx, 91, 12, 111, 75, "#08131e", "#244c68", "#a67843");
  box(ctx, "#071a30", 97, 18, 99, 63);
  box(ctx, "#e8c75b", 97, 18, 99, 3);
  box(ctx, "#e8c75b", 97, 48, 99, 3);
  box(ctx, "#e8c75b", 144, 18, 4, 63);
  box(ctx, "#6f613d", 101, 70, 39, 3);
  box(ctx, "#6f613d", 152, 70, 40, 3);
  box(ctx, "#12243a", 172, 64, 8, 17);
  box(ctx, "#172d43", 181, 57, 12, 24);
  box(ctx, "#f2cf67", 184, 62, 2, 3);
  box(ctx, "#e9be55", 175, 69, 2, 3);

  // Warm light from the left hall and the bedside lamp falls in stepped pixels.
  box(ctx, "#f1c75a", 0, 68, 8, 87);
  box(ctx, "#ffe576", 8, 76, 5, 69);
  box(ctx, "#f3c95c24", 13, 84, 74, 65);
  box(ctx, "#e8a94c1f", 24, 92, 88, 48);

  // Personal wall details: framed family drawing, shelf, plants and calendar.
  outline(ctx, 15, 25, 34, 39, "#08131a", "#684c39", "#c0925c");
  box(ctx, "#d9c58f", 20, 30, 24, 27);
  box(ctx, "#ef7a52", 26, 39, 7, 9);
  box(ctx, "#709b63", 34, 36, 6, 12);
  box(ctx, "#6b4637", 59, 38, 55, 5);
  box(ctx, "#9b6845", 63, 43, 47, 3);
  box(ctx, "#8e5839", 69, 31, 13, 10);
  box(ctx, "#57905d", 72, 22, 7, 10);
  box(ctx, "#4c754c", 68, 25, 5, 7);
  box(ctx, "#8e5839", 91, 30, 13, 11);
  box(ctx, "#7652a1", 94, 22, 8, 9);
  outline(ctx, 274, 18, 23, 27, "#09131a", "#d4c39b", "#f0dfb3");
  box(ctx, "#bd594e", 278, 22, 15, 5);
  box(ctx, "#635847", 280, 31, 3, 3);
  box(ctx, "#635847", 286, 31, 3, 3);
  box(ctx, "#635847", 280, 37, 3, 3);

  // Wide floor rug and the oversized panda follow the reference room silhouette.
  outline(ctx, 24, 133, 160, 39, "#0a1822", "#304c64", "#71869a");
  box(ctx, "#52687f", 31, 139, 146, 27);
  box(ctx, "#6f8296", 39, 143, 54, 3);
  box(ctx, "#415a70", 105, 159, 58, 3);
  // Large seated panda: round ears, head, belly, arms and paw pads.
  box(ctx, "#171b21", 36, 82, 15, 15); box(ctx, "#171b21", 75, 82, 15, 15);
  outline(ctx, 39, 87, 48, 40, "#0b1015", "#c9c8c2", "#eeeae0");
  box(ctx, "#181c22", 46, 96, 10, 13); box(ctx, "#181c22", 70, 96, 10, 13);
  box(ctx, "#f0c7bd", 48, 107, 6, 3); box(ctx, "#f0c7bd", 72, 107, 6, 3);
  box(ctx, "#171b20", 61, 106, 6, 5); box(ctx, "#171b20", 62, 114, 6, 3);
  box(ctx, "#181c21", 30, 116, 15, 28); box(ctx, "#181c21", 81, 116, 15, 28);
  outline(ctx, 43, 123, 41, 29, "#0d1217", "#aaa9a5", "#d5d3cd");
  box(ctx, "#181c21", 36, 143, 20, 12); box(ctx, "#181c21", 72, 143, 20, 12);
  box(ctx, "#777a79", 41, 146, 4, 5); box(ctx, "#777a79", 48, 145, 4, 5);
  box(ctx, "#777a79", 77, 145, 4, 5); box(ctx, "#777a79", 84, 146, 4, 5);

  // Study desk with monitor, books, mug, PC and an acoustic guitar.
  outline(ctx, 217, 94, 83, 9, "#071219", "#604b42", "#a57a59");
  box(ctx, "#644c42", 221, 103, 6, 48); box(ctx, "#644c42", 290, 103, 6, 48);
  outline(ctx, 232, 55, 47, 34, "#07131b", "#343f48", "#788897");
  box(ctx, "#17232d", 237, 60, 37, 23);
  box(ctx, "#526270", 240, 63, 22, 2);
  box(ctx, "#414950", 252, 89, 7, 5);
  box(ctx, "#323942", 240, 95, 36, 4);
  box(ctx, "#d7c3a0", 278, 81, 9, 12); box(ctx, "#b16a49", 286, 84, 4, 6);
  box(ctx, "#593f52", 284, 65, 15, 5); box(ctx, "#2f4659", 286, 59, 13, 6);
  outline(ctx, 270, 107, 21, 44, "#071119", "#12171d", "#343b43");
  box(ctx, "#d8a64d", 278, 115, 3, 3);
  box(ctx, "#805434", 307, 58, 4, 70); box(ctx, "#bd7747", 301, 118, 16, 25);
  box(ctx, "#d99a58", 304, 124, 10, 11); box(ctx, "#36251f", 307, 128, 4, 4);

  // Desk chair, cables and scattered personal objects add the same lived-in clutter.
  outline(ctx, 233, 114, 28, 32, "#081219", "#323b43", "#66717a");
  box(ctx, "#394149", 240, 145, 5, 19); box(ctx, "#394149", 251, 145, 5, 19);
  box(ctx, "#394149", 230, 163, 32, 3); box(ctx, "#394149", 229, 166, 6, 3); box(ctx, "#394149", 258, 166, 6, 3);
  // Slime plush, alarm clock, game pad, sketchbook and paint swatches.
  box(ctx, "#315f3c", 104, 136, 18, 10); box(ctx, "#4d824a", 108, 132, 10, 5);
  box(ctx, "#d7da9a", 110, 138, 2, 2); box(ctx, "#d7da9a", 116, 138, 2, 2);
  outline(ctx, 129, 135, 20, 12, "#09141b", "#222831", "#4b5159"); box(ctx, "#db8151", 136, 140, 4, 2);
  box(ctx, "#20262d", 159, 136, 24, 7); box(ctx, "#68727a", 163, 134, 4, 3); box(ctx, "#68727a", 176, 134, 4, 3);
  box(ctx, "#b9b3a1", 187, 157, 20, 14); box(ctx, "#313b48", 190, 160, 14, 8);
  box(ctx, "#b9544e", 130, 154, 10, 7); box(ctx, "#4b8a69", 143, 158, 11, 7);
  box(ctx, "#d38a45", 158, 153, 10, 7); box(ctx, "#397b6a", 171, 158, 12, 7);
  box(ctx, "#202832", 148, 146, 3, 9); box(ctx, "#202832", 181, 146, 3, 10);
  if (tv) {
    // CRT casing, speaker grille, control light and a readable news studio.
    outline(ctx, 91, 23, 174, 108, "#090b11", "#242c38", "#657687");
    outline(ctx, 101, 30, 144, 86, "#080b12", "#2d5871", "#85b6c5");
    for (let i = 0; i < 52; i++)
      box(
        ctx,
        i % 3 ? "#a9cdd6" : "#315d71",
        104 + ((i * 37 + frame * 9) % 138),
        33 + ((i * 19) % 78), 1, 1,
      );
    box(ctx, "#19354b", 104, 33, 138, 56);
    box(ctx, "#446c85", 106, 35, 134, 4);
    // Use the same high-quality pixel portrait system as dialogue cutscenes.
    const announcer = getCastSheet();
    if (announcer) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(announcer, 1068, 0, 356, 355, 145, 38, 59, 53);
      ctx.restore();
    } else {
      box(ctx, "#1d2633", 153, 47, 43, 42);
      box(ctx, "#d6aa98", 160, 48, 29, 22);
    }
    box(ctx, "#10151f", 112, 83, 119, 6);
    box(ctx, "#c5bca7", 211, 67, 2, 17);
    box(ctx, "#1b1720", 207, 64, 10, 5);
    box(ctx, "#a91633", 104, 89, 138, 15);
    ctx.fillStyle = "#fff1d2"; ctx.font = "bold 7px monospace";
    ctx.fillText("BREAKING NEWS", 110, 99);
    box(ctx, "#09121b", 104, 104, 138, 9);
    box(ctx, "#d9e3df", 110, 107, 102, 2);
    for (let sy = 36; sy < 111; sy += 8) box(ctx, "#ffffff22", 104, sy, 137, 1);
    for (let sy = 42; sy < 111; sy += 8) box(ctx, "#111111", 250, sy, 8, 2);
    box(ctx, "#c52c42", 255, 118, 5, 5);
  } else drawCharacter(ctx, { x: 197, y: 145 }, "down", frame % 3);
  // Rain belongs outside: clip every drop to the glass instead of the whole room.
  ctx.save();
  ctx.beginPath();
  ctx.rect(97, 18, 99, 63);
  ctx.clip();
  drawRain(ctx, frame);
  drawRain(ctx, frame + 17);
  ctx.restore();
}

function drawTelevisionOverlay(ctx: CanvasRenderingContext2D, frame: number) {
  // CRT casing, speaker grille, control light and a readable news studio.
  outline(ctx, 91, 23, 174, 108, "#090b11", "#242c38", "#657687");
  outline(ctx, 101, 30, 144, 86, "#080b12", "#2d5871", "#85b6c5");
  for (let i = 0; i < 52; i++)
    box(
      ctx,
      i % 3 ? "#a9cdd6" : "#315d71",
      104 + ((i * 37 + frame * 9) % 138),
      33 + ((i * 19) % 78), 1, 1,
    );
  box(ctx, "#19354b", 104, 33, 138, 56);
  box(ctx, "#446c85", 106, 35, 134, 4);
  const announcer = getCastSheet();
  if (announcer) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(announcer, 1068, 0, 356, 355, 145, 38, 59, 53);
    ctx.restore();
  } else {
    box(ctx, "#1d2633", 153, 47, 43, 42);
    box(ctx, "#d6aa98", 160, 48, 29, 22);
  }
  box(ctx, "#10151f", 112, 83, 119, 6);
  box(ctx, "#c5bca7", 211, 67, 2, 17);
  box(ctx, "#1b1720", 207, 64, 10, 5);
  box(ctx, "#a91633", 104, 89, 138, 15);
  ctx.fillStyle = "#fff1d2";
  ctx.font = "bold 7px monospace";
  ctx.fillText("BREAKING NEWS", 110, 99);
  box(ctx, "#09121b", 104, 104, 138, 9);
  box(ctx, "#d9e3df", 110, 107, 102, 2);
  for (let sy = 36; sy < 111; sy += 8) box(ctx, "#ffffff22", 104, sy, 137, 1);
  for (let sy = 42; sy < 111; sy += 8) box(ctx, "#111111", 250, sy, 8, 2);
  box(ctx, "#c52c42", 255, 118, 5, 5);
}

function drawHighDensityRoom(
  ctx: CanvasRenderingContext2D,
  frame: number,
  television = false,
  showYuna = true,
) {
  const background = getRoomBackground();
  if (!background) {
    drawRoom(ctx, frame, television);
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(background, 0, 0, 320, 180);
  // Keep the generated background static while the glass carries live rain.
  ctx.beginPath();
  ctx.rect(77, 10, 116, 74);
  ctx.clip();
  drawRain(ctx, frame);
  ctx.restore();
  if (television) drawTelevisionOverlay(ctx, frame);
  else if (showYuna) {
    // Yuna remains a separate sprite layer so she is as crisp as in-game.
    drawCharacter(ctx, { x: 174, y: 150 }, "down", frame % 3);
  }
}

function drawPhone(ctx: CanvasRenderingContext2D, frame: number) {
  // The room remains visible while the phone takes focus as a modal overlay.
  box(ctx, "#07050bb8", 0, 0, 320, 180);
  dither(ctx, 0, 0, 320, 180, "#4a173066", 9);
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
  box(ctx, "#e8ddd2", 108, 25, 104, 8);
  ctx.fillStyle = "#251623"; ctx.font = "bold 7px monospace";
  ctx.fillText("10:13 PM", 115, 31);
  box(ctx, "#6c1730", 108, 35, 104, 18);
  box(ctx, "#e6cbd0", 114, 40, 8, 8);
  box(ctx, "#522338", 116, 41, 4, 5);
  ctx.fillStyle = "#ffe8eb"; ctx.fillText("서아", 128, 47);
  // Clearly separated chat bubbles with tails and typed message lines.
  outline(ctx, 112, 59, 88, 31, "#3e101f", "#8f2941", "#d35c72");
  box(ctx, "#8f2941", 196, 83, 8, 5);
  box(ctx, "#ffe3e7", 120, 67, 64, 2); box(ctx, "#ffe3e7", 120, 74, 53, 2);
  outline(ctx, 120, 98, 88, 35, "#531025", "#c51f43", "#ed6077");
  box(ctx, "#c51f43", 204, 125, 8, 5);
  box(ctx, "#ffe1e6", 128, 106, 65, 2); box(ctx, "#ffe1e6", 128, 113, 70, 2);
  box(ctx, "#ffe1e6", 128, 120, 48, 2);
  outline(ctx, 139, 143, 42, 17, "#340b18", "#98152f", "#dc3955");
  box(ctx, "#f2d4da", 151, 149, 17, 2);
  box(ctx, "#b8a99e", 149, 166, 22, 3);
  if (frame % 4 < 2) box(ctx, "#f14a61", 99, 43, 3, 12);
}

function drawSchool(ctx: CanvasRenderingContext2D, frame: number) {
  box(ctx, "#07101b", 0, 0, 320, 126);
  box(ctx, "#151b22", 0, 126, 320, 54);
  dither(ctx, 0, 126, 320, 54, "#2d3d46", 4);
  outline(ctx, 38, 13, 244, 139, "#070b11", "#24303a", "#52616a");
  box(ctx, "#111820", 46, 21, 228, 7);
  outline(ctx, 91, 29, 138, 23, "#15141a", "#d1c39e", "#f0dfb5");
  ctx.fillStyle = "#3e2630"; ctx.font = "bold 9px monospace";
  ctx.fillText("무지개 미술학원", 105, 44);
  box(ctx, "#67513d", 100, 52, 120, 3);
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
      box(ctx, "#090d13", 76 + col * 40, 62 + row * 38, 2, 25);
      box(ctx, "#090d13", 66 + col * 40, 73 + row * 38, 23, 2);
    }
  // Main door, side entrance, red basement light and chained gate.
  outline(ctx, 126, 112, 68, 39, "#05080c", "#11161d", "#394652");
  box(ctx, "#08070c", 158, 114, 3, 36);
  box(ctx, "#a11a35", 132, 140, 56, 8);
  dither(ctx, 132, 140, 56, 8, "#f32652", 3);
  outline(ctx, 246, 94, 25, 58, "#05080c", "#11161d", "#52606a");
  box(ctx, "#bda561", 249, 120, 15, 3);
  box(ctx, "#bda561", 255, 114, 3, 16);
  drawCharacter(ctx, { x: 82, y: 160 }, "up", frame % 3);
  box(ctx, "#242d35", 0, 145, 320, 4);
  for (let i = 0; i < 10; i++) {
    box(ctx, "#34434d", i * 37 - 8, 137, 3, 43);
    box(ctx, "#34434d", i * 37 - 8, 148, 27, 3);
  }
  for (let i = 0; i < 6; i++) box(ctx, "#9b8b61", 112 + i * 11, 151 - i, 8, 2);
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
  const scale = Math.max(1, ctx.canvas.width / 320);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  box(ctx, "#05060b", 0, 0, 320, 180);
  if (kind === "room") drawHighDensityRoom(ctx, frame);
  else if (kind === "tv") drawHighDensityRoom(ctx, frame, true);
  else if (kind === "phone") {
    drawHighDensityRoom(ctx, frame, false, false);
    drawPhone(ctx, frame);
  }
  else drawSchool(ctx, frame);
  ctx.restore();
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
