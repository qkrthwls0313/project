/* eslint-disable react-hooks/immutability, react-hooks/static-components, react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { renderGame, renderOpening } from "@/game/pixelRenderer";

type Scene = "title" | "opening" | "game" | "ending";
type Dir = "up" | "down" | "left" | "right";
type Floor = "1F" | "2F" | "B1F" | "B2F" | "B3F";
type Flag =
  | "note"
  | "diary2"
  | "diary3"
  | "diary4"
  | "key"
  | "red"
  | "yellow"
  | "blue"
  | "solvent"
  | "puzzle"
  | "seoaCut"
  | "klemCut"
  | "clue"
  | "burned"
  | "chase";
type SaveData = {
  x: number;
  y: number;
  flags: Flag[];
  chapter: number;
  sanity?: number;
  battery?: number;
  floor?: Floor;
};

const W = 768,
  H = 432;
const SAVE_KEY = "rainbow-atelier-save-v1";
const dialogues: Record<string, string[]> = {
  intro: [
    "유나: 오늘도 원장님 수업은 참 따뜻해.",
    "…그런데, 복도에서 기름 냄새가 나.",
    "[조작] 방향키/WASD 이동 · Z/Space 조사 · Shift 달리기",
  ],
  note: [
    "『아이들이 두려움은 정맥의 푸른빛을 더욱 깊게 만든다.』",
    "유나: 이건… 원장님의 글씨야.",
  ],
  locked: [
    "지하 문이다. 세 개의 안료 홈이 비어 있다.",
    "붉은색 물감을 먼저 찾아야 할 것 같다.",
  ],
  red: [
    "동맥의 붉은색 물감 튜브를 얻었다.",
    "손끝에 닿자 미지근한 맥박이 느껴진다.",
  ],
  puzzle: [
    "R · G · B 안료가 하나의 회색으로 가라앉는다.",
    "철컥. 지하 2층으로 향하는 문이 열렸다.",
  ],
  clue: [
    "낡은 작업대 아래에서 붉은 머리끈을 발견했다.",
    "유나: 유진이 거야… 동생은 분명 여기까지 왔었어.",
    "[TRUE CLUE] 엔딩의 진실에 한 걸음 가까워졌다.",
  ],
  key: [
    "원장실 액자 뒤에서 청동 열쇠를 찾았다.",
    "[BRONZE BASEMENT KEY] 지하 1층 출입문을 열 수 있다.",
  ],
  seoa: [
    "핏빛 캔버스 속 얼굴이 눈을 떴다.",
    "서아: …유…나… 도…망…쳐…",
    "핏빛 붉은 안료와 뇌척수액 푸른 안료를 회수했다.",
  ],
  craft: [
    "두 안료가 부글거리며 주황빛 용제로 변했다.",
    "[ORANGE SOLVENT] B2F의 부식된 철문을 녹일 수 있다.",
  ],
  memory: [
    "유진: 언니가 나를 원장님에게 데려왔잖아.",
    "유나: 아니야… 난 그저 네 재능을 보여주고 싶었어…",
    "봉인했던 기억이 돌아온다. 증류소를 불태워야 한다.",
  ],
  minhyuk: [
    "민혁: 유나야… 손에 왜 그래? 피가… 피가 안 멈추잖아!",
    "유나: 선배, 이건 피가 아니라 ‘황금빛 노란색’이야.",
    "민혁: 다음은 네 차례야. 네 안에는 아주 깊은 푸른 슬픔이 있거든…",
  ],
  escape: [
    "차가운 새벽 공기가 폐 안으로 들어온다.",
    "하지만 학원 지하에서는 아직도 붓 긁는 소리가 난다.",
  ],
};

function useAudio() {
  const ctx = useRef<AudioContext | null>(null);
  return useCallback((kind: "step" | "pickup" | "shock") => {
    try {
      const C =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const c = ctx.current ?? new C();
      ctx.current = c;
      const o = c.createOscillator(),
        g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      const now = c.currentTime;
      o.type = kind === "shock" ? "sawtooth" : "square";
      o.frequency.setValueAtTime(
        kind === "step" ? 90 : kind === "pickup" ? 480 : 55,
        now,
      );
      if (kind === "shock")
        o.frequency.exponentialRampToValueAtTime(620, now + 0.35);
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        now + (kind === "shock" ? 0.45 : 0.08),
      );
      o.start(now);
      o.stop(now + (kind === "shock" ? 0.46 : 0.09));
    } catch {}
  }, []);
}

export default function RainbowAtelier() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const player = useRef({ x: 102, y: 306, dir: "down" as Dir });
  const enemy = useRef({ x: 650, y: 90 });
  const [scene, setScene] = useState<Scene>("title"),
    [dialog, setDialog] = useState<string[]>([]),
    [line, setLine] = useState(0),
    [flags, setFlags] = useState<Flag[]>([]),
    [floor, setFloor] = useState<Floor>("1F"),
    [chapter, setChapter] = useState(1),
    [stamina, setStamina] = useState(100),
    [sanity, setSanity] = useState(100),
    [battery, setBattery] = useState(100),
    [light, setLight] = useState(true),
    [inventory, setInventory] = useState(false),
    [paused, setPaused] = useState(false),
    [mixing, setMixing] = useState(false),
    [hiding, setHiding] = useState(false),
    [horrorCut, setHorrorCut] = useState<"seoa" | "klem" | null>(null),
    [residual, setResidual] = useState(false),
    [flash, setFlash] = useState(false),
    [hasSave, setHasSave] = useState(
      () => typeof window !== "undefined" && !!localStorage.getItem(SAVE_KEY),
    ),
    [ending, setEnding] = useState<"normal" | "bad" | "true">("normal");
  const beep = useAudio();
  const flagsRef = useRef(flags);
  const floorRef = useRef(floor);
  const dialogRef = useRef(dialog);
  const staminaRef = useRef(stamina);
  const sanityRef = useRef(sanity);
  const batteryRef = useRef(battery);
  const chapterRef = useRef(chapter);
  const last = useRef(0);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);
  useEffect(() => {
    floorRef.current = floor;
  }, [floor]);
  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);
  useEffect(() => {
    staminaRef.current = stamina;
  }, [stamina]);
  useEffect(() => {
    sanityRef.current = sanity;
  }, [sanity]);
  useEffect(() => {
    batteryRef.current = battery;
  }, [battery]);
  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);
  const speak = useCallback((lines: string[]) => {
    setDialog(lines);
    setLine(0);
  }, []);
  const addFlag = useCallback(
    (f: Flag) => setFlags((v) => (v.includes(f) ? v : [...v, f])),
    [],
  );
  const save = useCallback(() => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        x: player.current.x,
        y: player.current.y,
        flags: flagsRef.current,
        chapter: chapterRef.current,
        sanity: sanityRef.current,
        battery: batteryRef.current,
        floor: floorRef.current,
      } satisfies SaveData),
    );
    setHasSave(true);
    beep("pickup");
  }, [beep]);
  const start = useCallback((load = false) => {
    if (load) {
      try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "") as SaveData;
        player.current.x = s.x;
        player.current.y = s.y;
        setFlags(s.flags);
        setChapter(s.chapter);
        setSanity(s.sanity ?? 100);
        setBattery(s.battery ?? 100);
        setFloor(s.floor ?? "1F");
      } catch {}
      setScene("game");
    } else {
      player.current = { x: 102, y: 306, dir: "down" };
      setFlags([]);
      setFloor("1F");
      setChapter(1);
      setSanity(100);
      setBattery(100);
      setScene("opening");
    }
  }, []);

  const warp = useCallback((next: Floor, x = 105, y = 305) => {
    setFloor(next);
    player.current = { x, y, dir: "down" };
    enemy.current = { x: 650, y: 90 };
  }, []);
  const interact = useCallback(() => {
    if (dialogRef.current.length) {
      if (line < dialogRef.current.length - 1) setLine((v) => v + 1);
      else setDialog([]);
      return;
    }
    const { x, y } = player.current,
      f = flagsRef.current,
      fl = floorRef.current;
    if (fl === "1F") {
      if (x < 180 && y < 165 && !f.includes("note")) {
        addFlag("note");
        speak([
          "[일기 1/4] 실종 학생들은 모두 ‘색채 적성’ 검사를 받았다.",
          ...dialogues.note,
        ]);
        beep("pickup");
      } else if (x > 585 && y < 165 && !f.includes("key")) {
        addFlag("key");
        speak(dialogues.key);
        beep("pickup");
      } else if (x > 300 && x < 500 && y < 165) warp("2F", 105, 305);
      else if (x > 610 && y > 280) {
        if (f.includes("key")) warp("B1F");
        else speak(["청동 자물쇠가 걸려 있다. 원장실을 수색해야 한다."]);
      }
    } else if (fl === "2F") {
      if (x < 180 && y < 165 && !f.includes("diary2")) {
        addFlag("diary2");
        speak([
          "[일기 2/4] 빨강은 피, 노랑은 담즙, 파랑은 뇌척수액. 원장은 인간을 안료로 분류했다.",
        ]);
        beep("pickup");
      } else if (x > 585 && y < 165 && !f.includes("yellow")) {
        addFlag("yellow");
        speak(["직원실 냉장고에서 담즙의 노란 안료를 얻었다."]);
        beep("pickup");
      } else if (x < 110 && y > 280) warp("1F", 380, 185);
    } else if (fl === "B1F") {
      if (x < 180 && y < 165 && !f.includes("red")) {
        addFlag("red");
        speak(dialogues.red);
        beep("pickup");
      } else if (x > 585 && y < 165 && !f.includes("blue")) {
        addFlag("blue");
        speak(["깨진 배양조에서 뇌척수액의 푸른 안료를 회수했다."]);
        beep("pickup");
      } else if (x > 610 && y > 280 && !f.includes("puzzle")) {
        if (f.includes("red") && f.includes("yellow") && f.includes("blue"))
          setMixing(true);
        else
          speak([
            "배합기에 R·G·B 안료가 모두 필요하다. 2F 직원실도 확인해 보자.",
          ]);
      } else if (
        x > 300 &&
        x < 500 &&
        y < 165 &&
        f.includes("puzzle") &&
        !f.includes("seoaCut")
      ) {
        addFlag("seoaCut");
        setSanity((v) => Math.max(0, v - 22));
        beep("shock");
        setHorrorCut("seoa");
      } else if (x < 110 && y > 280) warp("1F", 630, 270);
    } else if (fl === "B2F") {
      if (x < 180 && y < 165 && !f.includes("diary3")) {
        addFlag("diary3");
        speak([
          "[일기 3/4] 민혁은 살기 위해 학생들의 귀가 시간을 원장에게 넘겼다.",
          ...dialogues.minhyuk,
        ]);
        beep("pickup");
      } else if (x > 585 && y < 165) {
        setHiding(true);
        beep("pickup");
      } else if (x > 610 && y > 280) {
        if (f.includes("solvent")) {
          setChapter(3);
          warp("B3F");
        } else
          speak([
            "부식된 철문이 붙어 움직이지 않는다.",
            "가방에서 붉은 안료와 노란 안료를 조합해 보자.",
          ]);
      }
    } else if (fl === "B3F") {
      if (x < 180 && y < 165 && !f.includes("clue")) {
        addFlag("clue");
        speak(dialogues.clue);
        beep("pickup");
      } else if (x > 300 && x < 500 && y < 165 && !f.includes("diary4")) {
        addFlag("diary4");
        speak([
          "[일기 4/4] 유진은 일곱 번째 안료가 아니었다. 원장을 멈출 유일한 기억의 닻이었다.",
          ...dialogues.memory,
        ]);
        beep("pickup");
      } else if (x > 585 && y < 165 && !f.includes("burned")) {
        addFlag("burned");
        addFlag("chase");
        enemy.current = { x: 70, y: 80 };
        setChapter(4);
        setSanity((v) => Math.max(0, v - 20));
        setFlash(true);
        beep("shock");
        speak([
          "라이터 불꽃이 증류소로 번진다.",
          "클렘: 내 색을 망치지 마!",
          "불길을 피해 1층 출구로 달려가야 한다!",
        ]);
        setTimeout(() => setFlash(false), 700);
      } else if (x < 110 && y > 280 && f.includes("burned")) {
        const diaries = ["note", "diary2", "diary3", "diary4"].filter((d) =>
          f.includes(d as Flag),
        ).length;
        setEnding(f.includes("clue") && diaries === 4 ? "true" : "normal");
        setScene("ending");
      }
    }
  }, [addFlag, beep, line, speak, warp]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      keys.current.add(e.key.toLowerCase());
      if (e.key === " " || e.key.toLowerCase() === "z") interact();
      if (e.key.toLowerCase() === "f") setLight((v) => !v);
      if (e.key.toLowerCase() === "i" || e.key === "Tab") {
        e.preventDefault();
        setInventory((v) => !v);
      }
      if (e.key === "Escape") setPaused((v) => !v);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, [interact]);

  useEffect(() => {
    if (scene !== "game") return;
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min((t - last.current) / 16.67, 2);
      last.current = t;
      const k = keys.current,
        p = player.current;
      const running = k.has("shift") && staminaRef.current > 0;
      const speed = (running ? 3.4 : 2.05) * dt;
      if (
        !paused &&
        !inventory &&
        !mixing &&
        !hiding &&
        !horrorCut &&
        !dialogRef.current.length
      ) {
        let dx = 0,
          dy = 0;
        if (k.has("arrowleft") || k.has("a")) {
          dx = -speed;
          p.dir = "left";
        }
        if (k.has("arrowright") || k.has("d")) {
          dx = speed;
          p.dir = "right";
        }
        if (k.has("arrowup") || k.has("w")) {
          dy = -speed;
          p.dir = "up";
        }
        if (k.has("arrowdown") || k.has("s")) {
          dy = speed;
          p.dir = "down";
        }
        p.x = Math.max(55, Math.min(W - 48, p.x + dx));
        p.y = Math.max(62, Math.min(H - 43, p.y + dy));
        setStamina((v) =>
          Math.max(
            0,
            Math.min(100, v + (running && (dx || dy) ? -0.45 : 0.28) * dt),
          ),
        );
        if (light && batteryRef.current > 0) {
          setBattery((v) => Math.max(0, v - 0.012 * dt));
          if (batteryRef.current < 0.2) setLight(false);
        }
        if (floorRef.current === "B2F" || flagsRef.current.includes("burned")) {
          setSanity((v) => Math.max(0, v - 0.018 * dt));
          const e = enemy.current,
            ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.x += Math.cos(ang) * 1.35 * dt;
          e.y += Math.sin(ang) * 1.35 * dt;
          if (Math.hypot(p.x - e.x, p.y - e.y) < 25 || sanityRef.current <= 0) {
            setEnding("bad");
            setScene("ending");
            beep("shock");
          }
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scene, paused, inventory, mixing, hiding, horrorCut, light, beep]);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const x = c.getContext("2d")!;
    const fl = floorRef.current;
    const horror = fl === "B2F" || flagsRef.current.includes("burned");
    renderGame(
      x,
      fl,
      player.current,
      enemy.current,
      light,
      batteryRef.current,
      performance.now(),
      horror,
    );
  }, [light]);

  const moveTouch = (d: Dir, on: boolean) => {
    const key = { up: "w", down: "s", left: "a", right: "d" }[d];
    if (on) keys.current.add(key);
    else keys.current.delete(key);
  };
  if (scene === "title")
    return (
      <TitleScreen
        onStart={() => start(false)}
        onLoad={() => start(true)}
        hasSave={hasSave}
      />
    );
  if (scene === "opening")
    return (
      <OpeningCutscene
        onComplete={() => {
          setScene("game");
          speak([
            "[메인 목표] 열려 있는 쪽문으로 진입하세요.",
            "1층 원장실을 수색하고 지하로 내려가는 열쇠를 확보하세요.",
            "[조작] 방향키/WASD 이동 · Z/Space 조사 · F 손전등",
          ]);
        }}
      />
    );
  if (scene === "ending")
    return (
      <Ending
        kind={ending}
        onAgain={() => {
          enemy.current = { x: 650, y: 90 };
          start(false);
        }}
      />
    );
  const diaries = ["note", "diary2", "diary3", "diary4"].filter((d) =>
    flags.includes(d as Flag),
  ).length;
  const objective =
    floor === "1F"
      ? !flags.includes("key")
        ? "원장실에서 청동 지하 열쇠 찾기"
        : "B1F 출입문 또는 2F 조사"
      : floor === "2F"
        ? "직원실의 노란 안료와 일기 수색"
        : floor === "B1F"
          ? !flags.includes("puzzle")
            ? "세 안료를 모아 RGB 배합기 가동"
            : "서아의 캔버스를 조사"
          : floor === "B2F"
            ? !flags.includes("solvent")
              ? "가방에서 오렌지 용제 조합"
              : "부식된 철문을 녹이고 B3F로 이동"
            : !flags.includes("burned")
              ? `기억 수집 ${diaries}/4 · 머리끈 · 증류소 조사`
              : "불타는 증류소에서 출구로 탈출!";
  const distorted = sanity < 40;
  return (
    <main
      className={`min-h-screen bg-[#090b17] px-3 py-5 lg:px-8 ${distorted ? "glitch" : ""}`}
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[.35em] text-rose-400">
              THE RAINBOW ATELIER
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">
              무지개빛 미술학원
            </h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            CHAPTER {chapter} · {floor} · 일기 {diaries}/4
            <br />
            <span className="text-amber-300">
              {distorted ? "누가 내 붓으로 너를 그리고 있어…" : objective}
            </span>
          </div>
        </header>
        <section
          className={`relative overflow-hidden border-4 border-[#272b42] bg-black shadow-2xl crt ${flash ? "glitch" : ""}`}
        >
          <canvas
            ref={canvas}
            width={W}
            height={H}
            className="pixel block aspect-video w-full"
            aria-label="무지개빛 미술학원 게임 화면"
          />
          {residual && (
            <div className="horror-residual pointer-events-none absolute inset-0 z-30" />
          )}
          {horrorCut && (
            <HorrorCutscene
              key={horrorCut}
              kind={horrorCut}
              sanity={sanity}
              onComplete={() => {
                if (horrorCut === "seoa") {
                  warp("B2F");
                  setChapter(2);
                  addFlag("klemCut");
                  setHorrorCut("klem");
                } else {
                  setHorrorCut(null);
                  addFlag("chase");
                  speak([...dialogues.seoa, ...dialogues.minhyuk]);
                  setResidual(true);
                  setTimeout(() => setResidual(false), 5000);
                }
              }}
            />
          )}
          <div className="absolute left-3 top-3 z-20 flex gap-2">
            <Hud label="STAMINA" value={stamina} />
            <Hud label="SANITY" value={sanity} danger />
            <Hud label="BATTERY" value={battery} danger />
            <button
              onClick={() => setLight((v) => !v)}
              className="border border-white/20 bg-black/65 px-2 text-xs"
            >
              {light ? "◉ LIGHT" : "○ DARK"}
            </button>
          </div>
          {(floor === "B2F" || flags.includes("burned")) && (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-20 text-center text-sm font-black tracking-[.35em] text-red-500">
              RUN · 캐비닛에서 숨을 수 있다
            </div>
          )}
          {dialog.length > 0 && (
            <button
              onClick={interact}
              className="pixel-dialogue absolute inset-x-4 bottom-4 z-40 min-h-28 text-left text-sm leading-7 sm:text-base"
            >
              <Portrait
                character={
                  dialog[line].startsWith("서아:")
                    ? "seoa"
                    : dialog[line].startsWith("민혁:")
                      ? "minhyuk"
                      : dialog[line].startsWith("클렘:")
                        ? "klem"
                        : "yuna"
                }
                mood={
                  sanity < 30
                    ? "insane"
                    : floor === "B2F" || flags.includes("burned")
                      ? "terrified"
                      : sanity < 70
                        ? "suspicious"
                        : "neutral"
                }
              />
              <span className="pixel-dialogue-copy">
                <b className="pixel-speaker">
                  {dialog[line].includes(":")
                    ? dialog[line].split(":")[0]
                    : "유나"}
                </b>
                <span>{dialog[line]}</span>
              </span>
              <span className="float absolute bottom-2 right-3 text-amber-300">
                ▼
              </span>
            </button>
          )}
          {inventory && (
            <Inventory
              flags={flags}
              sanity={sanity}
              craft={() => {
                if (
                  flags.includes("red") &&
                  flags.includes("yellow") &&
                  !flags.includes("solvent")
                ) {
                  addFlag("solvent");
                  setInventory(false);
                  speak(dialogues.craft);
                  beep("pickup");
                }
              }}
              close={() => setInventory(false)}
            />
          )}{" "}
          {mixing && (
            <MixingPuzzle
              close={() => setMixing(false)}
              complete={() => {
                setMixing(false);
                addFlag("puzzle");
                setChapter(2);
                speak(dialogues.puzzle);
                beep("pickup");
              }}
            />
          )}
          {hiding && (
            <HideQTE
              done={(success) => {
                setHiding(false);
                if (success) {
                  enemy.current = { x: 80, y: 340 };
                  setSanity((v) => Math.min(100, v + 12));
                } else {
                  setSanity((v) => Math.max(0, v - 25));
                  beep("shock");
                }
              }}
            />
          )}
          {paused && (
            <Pause
              save={save}
              close={() => setPaused(false)}
              quit={() => setScene("title")}
            />
          )}
        </section>
        <footer className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-[1fr_auto]">
          <p>
            방향키 / WASD 이동 · Shift 달리기 · Z / Space 조사 · F 손전등 · I /
            Tab 가방 · ESC 메뉴
          </p>
          <div className="flex items-center justify-center gap-2 md:hidden">
            <Dpad move={moveTouch} />
            <button
              onPointerDown={interact}
              className="h-14 w-14 rounded-full border-2 border-rose-400 bg-rose-500/20 font-black text-rose-200"
            >
              Z
            </button>
          </div>
          <p className="text-right text-slate-600">
            ESC 메뉴에서 저장 · 광기 0% 시 BAD ENDING
          </p>
        </footer>
      </div>
    </main>
  );
}

function Hud({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="w-24 border border-white/20 bg-black/65 p-1 sm:w-28">
      <div className="mb-1 text-[8px] tracking-widest">
        {label} {Math.round(value)}
      </div>
      <div className="h-1.5 bg-white/10">
        <div
          className={`h-full transition-all ${danger && value < 40 ? "bg-red-500" : "bg-amber-300"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
function Portrait(props: {
  mood: "neutral" | "suspicious" | "terrified" | "insane";
  character: "yuna" | "seoa" | "minhyuk" | "klem" | "announcer";
}) {
  if (props.character === "yuna") {
    return (
      <Image
        src="/assets/portraits/yuna-dialogue.png"
        alt={`유나 ${props.mood} 대화 초상`}
        width={1024}
        height={1536}
        priority
        unoptimized
        className={`dialogue-portrait dialogue-portrait-art ${props.mood === "insane" ? "glitch" : ""}`}
      />
    );
  }
  return <PixelPortrait {...props} />;
}
function HorrorCutscene(props: {
  kind: "seoa" | "klem";
  sanity: number;
  onComplete: () => void;
}) {
  return <PixelHorrorCutscene {...props} />;
}

function drawDetailedYunaPortrait(
  x: CanvasRenderingContext2D,
  mood: "neutral" | "suspicious" | "terrified" | "insane",
) {
  const r = (c: string, px: number, py: number, w: number, h: number) => {
    x.fillStyle = c;
    x.fillRect(px, py, w, h);
  };
  x.clearRect(0, 0, 128, 192);
  const edge = "#100e19",
    hairDark = mood === "insane" ? "#264c64" : "#365f83";
  const hair = mood === "insane" ? "#4b7891" : "#78add0",
    hairLight = "#b8d9e7";
  const skin = "#dba998",
    skinLight = "#f2c8b4",
    skinShade = "#a96f72";
  // Stepped hair silhouette and neck outline.
  [
    [38, 5, 52, 4],
    [27, 9, 73, 5],
    [19, 14, 89, 7],
    [14, 21, 99, 12],
    [10, 33, 108, 30],
    [8, 55, 111, 33],
    [11, 83, 103, 23],
    [17, 104, 91, 18],
  ].forEach((v) => r(edge, ...(v as [number, number, number, number])));
  [
    [40, 8, 47, 5],
    [29, 13, 68, 6],
    [22, 18, 82, 8],
    [17, 26, 93, 15],
    [14, 39, 98, 25],
    [12, 62, 101, 20],
    [16, 81, 93, 20],
    [22, 99, 80, 15],
  ].forEach((v) => r(hairDark, ...(v as [number, number, number, number])));
  // Face with pixel-stepped jaw.
  r(edge, 29, 35, 71, 62);
  r(edge, 34, 94, 61, 12);
  r(skin, 33, 39, 63, 56);
  r(skin, 38, 94, 53, 8);
  r(skinLight, 37, 43, 48, 7);
  r(skinShade, 34, 79, 5, 15);
  r(skinShade, 90, 68, 5, 24);
  // Layered side bangs.
  [
    [18, 29, 35, 8],
    [20, 35, 29, 10],
    [25, 43, 21, 14],
    [39, 18, 18, 39],
    [51, 14, 17, 44],
    [65, 17, 18, 39],
    [78, 23, 20, 31],
    [92, 31, 17, 25],
  ].forEach((v, i) =>
    r(
      i % 3 === 0 ? hairLight : hair,
      ...(v as [number, number, number, number]),
    ),
  );
  r(hairDark, 20, 50, 12, 48);
  r(hair, 14, 60, 16, 37);
  r(hairLight, 17, 62, 4, 25);
  r(hairDark, 96, 48, 14, 49);
  r(hair, 101, 55, 14, 38);
  r(hairLight, 106, 60, 3, 22);
  // Brows, eyes, lashes, highlights.
  r("#4d354d", 39, 56, 18, 3);
  r("#4d354d", 73, 56, 18, 3);
  r(edge, 37, 63, 22, 10);
  r(edge, 71, 63, 22, 10);
  r("#f7e9df", 40, 65, 16, 7);
  r("#f7e9df", 74, 65, 16, 7);
  r("#65439a", 45, 64, 9, 10);
  r("#65439a", 78, 64, 9, 10);
  r("#261c42", 48, 66, 6, 8);
  r("#261c42", 78, 66, 6, 8);
  r("#ffffff", 47, 65, 3, 3);
  r("#ffffff", 82, 65, 3, 3);
  r(edge, 35, 61, 7, 3);
  r(edge, 88, 61, 7, 3);
  // Nose, mouth and mood marks.
  r(skinShade, 64, 75, 3, 5);
  r(
    mood === "insane" ? "#b5193b" : "#7d3f50",
    58,
    86,
    mood === "terrified" ? 17 : 12,
    3,
  );
  if (mood !== "neutral") {
    r("#7ea9bd", 98, 70, 3, 9);
    r("#b9dce5", 98, 70, 2, 5);
  }
  if (mood === "insane") {
    r("#b00031", 31, 74, 7, 2);
    r("#b00031", 88, 80, 9, 2);
  }
  // Gold hairpin.
  r("#3e2a16", 91, 31, 18, 4);
  r("#3e2a16", 98, 24, 4, 18);
  r("#e1ad2f", 92, 32, 16, 3);
  r("#e1ad2f", 99, 25, 3, 16);
  // Neck, shoulders, cardigan silhouette.
  r(edge, 49, 101, 30, 24);
  r(skin, 53, 100, 23, 25);
  r(edge, 24, 119, 81, 12);
  r(edge, 14, 129, 101, 63);
  r("#38284f", 27, 122, 74, 14);
  r("#4f3970", 19, 132, 93, 60);
  r("#705695", 25, 136, 24, 52);
  r("#2a203d", 83, 137, 24, 55);
  // White collar and gold ribbon.
  r(edge, 43, 116, 43, 28);
  r("#eee4d8", 46, 119, 17, 19);
  r("#eee4d8", 67, 119, 16, 19);
  r("#c89322", 60, 132, 12, 13);
  r("#e2b238", 63, 136, 7, 49);
  r("#8e6218", 59, 142, 4, 38);
  // Sleeves, hands and folds.
  r(edge, 8, 145, 23, 47);
  r("#4a3569", 12, 148, 20, 44);
  r(edge, 98, 144, 24, 48);
  r("#38284f", 101, 148, 18, 44);
  r(edge, 41, 151, 18, 31);
  r(skin, 44, 154, 13, 25);
  r(edge, 72, 158, 17, 27);
  r(skin, 75, 161, 11, 21);
  r("#8d6cac", 30, 151, 5, 28);
  r("#6d528e", 92, 151, 5, 30);
  r("#241b36", 35, 173, 16, 4);
  r("#241b36", 84, 177, 13, 4);
  // Clustered fabric dithering and crisp rim light.
  for (let py = 139; py < 190; py += 7)
    for (let px = 23 + (py % 2); px < 108; px += 11) r("#8065a1", px, py, 2, 2);
  r("#b5d7e5", 26, 20, 27, 3);
  r("#b5d7e5", 16, 44, 4, 28);
  r("#6b94ad", 107, 72, 3, 20);
}
function PixelPortrait({
  mood,
  character,
}: {
  mood: "neutral" | "suspicious" | "terrified" | "insane";
  character: "yuna" | "seoa" | "minhyuk" | "klem" | "announcer";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const x = ref.current?.getContext("2d");
    if (!x) return;
    x.imageSmoothingEnabled = false;
    if (character === "yuna") {
      drawDetailedYunaPortrait(x, mood);
      return;
    }
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, 64, 80);
    x.fillStyle = "#17131d";
    x.fillRect(14, 7, 36, 4);
    x.fillRect(8, 11, 48, 32);
    x.fillRect(12, 43, 40, 7);
    const hair =
      character === "seoa"
        ? "#b75972"
        : character === "minhyuk"
          ? "#6b4a38"
          : character === "announcer"
            ? "#293b55"
            : character === "klem"
              ? "#c6c0b4"
              : mood === "insane"
                ? "#346079"
                : "#83aec8";
    const hairShadow =
      character === "seoa"
        ? "#713449"
        : character === "minhyuk"
          ? "#3f2a25"
          : character === "announcer"
            ? "#17243a"
            : character === "klem"
              ? "#716b6b"
              : "#346079";
    x.fillStyle = hair;
    x.fillRect(14, 5, 36, 8);
    x.fillRect(9, 10, 13, 32);
    x.fillRect(43, 10, 12, 32);
    x.fillStyle = character === "klem" ? "#f1ead9" : "#b9d5df";
    x.fillRect(18, 7, 20, 3);
    x.fillStyle = "#d6a08f";
    x.fillRect(17, 15, 30, 29);
    x.fillRect(21, 44, 22, 5);
    x.fillStyle = "#2a1d2b";
    const e = mood === "terrified" || mood === "insane" ? 5 : 3;
    x.fillRect(23, 27, e, e);
    x.fillRect(38, 27, e, e);
    x.fillStyle = "#fff1df";
    x.fillRect(23, 27, 1, 1);
    x.fillRect(38, 27, 1, 1);
    x.fillStyle = mood === "insane" ? "#d61035" : "#763645";
    x.fillRect(
      mood === "neutral" ? 29 : 26,
      38,
      mood === "neutral" ? 8 : 14,
      2,
    );
    x.fillStyle = "#17131d";
    x.fillRect(10, 51, 44, 29);
    x.fillStyle =
      character === "seoa"
        ? "#713649"
        : character === "minhyuk"
          ? "#765036"
          : character === "announcer"
            ? "#334f72"
            : character === "klem"
              ? "#292433"
              : "#3c2d51";
    x.fillRect(13, 52, 38, 28);
    x.fillStyle = "#756194";
    x.fillRect(17, 54, 30, 4);
    x.fillStyle = "#d1ad35";
    x.fillRect(30, 50, 5, 30);
    x.fillStyle = "#d6a08f";
    x.fillRect(5, 58, 8, 22);
    x.fillRect(51, 58, 8, 22);
    x.fillStyle = hairShadow;
    x.fillRect(9, 36, 7, 7);
    x.fillRect(49, 35, 6, 8);
    if (character === "klem") {
      x.fillStyle = "#b71939";
      x.fillRect(23, 27, 4, 3);
      x.fillRect(38, 27, 4, 3);
    }
    if (mood === "insane") {
      x.fillStyle = "#b0002a";
      for (let i = 0; i < 64; i += 8) x.fillRect(i, (i * 3) % 75, 5, 2);
    }
  }, [mood, character]);
  return (
    <canvas
      ref={ref}
      width={128}
      height={192}
      aria-label={`${character} ${mood} 픽셀 초상`}
      className={`dialogue-portrait pixel-art-canvas ${mood === "insane" ? "glitch" : ""}`}
    />
  );
}

function PixelScene({
  mode,
  kind = "room",
  stage = "reveal",
  sanity = 100,
}: {
  mode: "opening" | "horror";
  kind?: "room" | "tv" | "phone" | "school" | "seoa" | "klem";
  stage?: "flash" | "reveal" | "decay";
  sanity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current,
      x = c?.getContext("2d");
    if (!c || !x) return;
    let raf = 0;
    const rect = (
      color: string,
      a: number,
      b: number,
      w: number,
      h: number,
    ) => {
      x.fillStyle = color;
      x.fillRect(a, b, w, h);
    };
    const loop = (now: number) => {
      const f = Math.floor(now / 180) % 4;
      x.imageSmoothingEnabled = false;
      rect("#060811", 0, 0, 320, 180);
      if (mode === "opening") {
        renderOpening(x, kind as "room" | "tv" | "phone" | "school", now);
        raf = requestAnimationFrame(loop);
        return;
      }
      if (stage === "flash") rect("#eadbca", 0, 0, 320, 180);
      else {
        rect(kind === "seoa" ? "#17060c" : "#10141b", 16, 12, 288, 156);
        if (kind === "seoa") {
          rect("#3c251b", 70, 25, 180, 118);
          rect("#a45d64", 79, 34, 162, 100);
          for (let yy = 35; yy < 133; yy += 4)
            for (let xx = 80; xx < 240; xx += 4)
              if ((xx + yy + f * 4) % 12 === 0) rect("#d39a87", xx, yy, 3, 3);
          rect("#65142a", 123, 65, 74, 31);
          rect("#ead7c3", 131, 70, 58, 20 - (f % 2) * 3);
          rect("#080407", 153 + f * 2, 71, 13, 18);
          rect("#a0082d", 102, 128, 7, 26 + f * 3);
          rect("#a0082d", 211, 126, 6, 30 - f * 2);
          for (let i = 0; i < 3; i++) {
            rect("#b8aaa0", 122 + i * 31, 148, 20, 22);
            rect("#850625", 125 + i * 31, 157, 14, 10);
          }
        } else {
          rect("#b7a390", 99 - f * 2, 25, 61, 125);
          rect("#73515b", 162 + f * 2, 25, 61, 125);
          rect("#14040a", 154, 26, 14, 123);
          rect("#f0e2ca", 132 - f * 2, 69, 10, 6);
          rect("#f0e2ca", 181 + f * 2, 69, 10, 6);
          for (let i = 0; i < 7; i++) {
            rect("#ead9b7", 157 + (i % 2 ? 5 : -2), 34 + i * 15, 5, 12);
            rect("#7c2034", 157 + (i % 2 ? 5 : -2), 43 + i * 15, 5, 5);
            rect("#d8c7a8", 151 + i * 3, 88 + i * 3, 4, 57 - i * 4);
          }
        }
        for (let i = 0; i < 70; i++)
          rect(
            i % 3 ? "#19080e" : "#750d29",
            (i * 47 + f * 13) % 320,
            (i * 29 + f * 7) % 180,
            2,
            2,
          );
        for (let yy = 3; yy < 180; yy += 6) rect("#252027", 0, yy, 320, 1);
        const shift = Math.max(1, Math.min(4, Math.round((100 - sanity) / 20)));
        for (let i = 0; i < 4; i++) {
          const yy = (i * 41 + f * 19) % 178;
          x.drawImage(c, 0, yy, 320, 2, i % 2 ? shift : -shift, yy, 320, 2);
        }
        if (stage === "decay")
          for (let yy = 0; yy < 180; yy += 12)
            rect(f % 2 ? "#000000" : "#72001d", 0, yy, 320, 4);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, kind, stage, sanity]);
  return (
    <canvas
      ref={ref}
      width={320}
      height={180}
      className="pixel-art-canvas absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

function PixelHorrorCutscene({
  kind,
  sanity,
  onComplete,
}: {
  kind: "seoa" | "klem";
  sanity: number;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<"flash" | "reveal" | "decay">("flash");
  useEffect(() => {
    const delay = stage === "flash" ? 100 : stage === "reveal" ? 2500 : 1500,
      t = setTimeout(
        () =>
          stage === "flash"
            ? setStage("reveal")
            : stage === "reveal"
              ? setStage("decay")
              : onComplete(),
        delay,
      );
    return () => clearTimeout(t);
  }, [stage, onComplete]);
  return (
    <div
      role="dialog"
      aria-label={
        kind === "seoa" ? "서아의 픽셀 공포 컷씬" : "클렘의 픽셀 공포 컷씬"
      }
      className="horror-cinema"
    >
      <PixelScene mode="horror" kind={kind} stage={stage} sanity={sanity} />
      <p className="horror-caption">
        {kind === "seoa"
          ? "그림이… 숨을 쉬고 있다."
          : "클렘: 완벽한 색은 살아 움직여야 하지."}
      </p>
      <div className="cinema-label">
        {stage === "flash"
          ? "IMPACT"
          : stage === "reveal"
            ? kind === "seoa"
              ? "CUTSCENE A · THE LIVING CANVAS"
              : "CUTSCENE B · THE SPLIT PAINTER"
            : "SIGNAL DECAY"}
      </div>
      <button onClick={onComplete} className="cinema-skip">
        눈을 돌린다
      </button>
    </div>
  );
}

type CutBeat = {
  scene: number;
  place: string;
  speaker: string;
  text: string;
  visual: "room" | "tv" | "phone" | "school";
  tone?: "danger" | "news";
};
const openingBeats: CutBeat[] = [
  {
    scene: 1,
    place: "유나의 방 · 10:09 PM",
    speaker: "",
    text: "비 내리는 밤. 창밖의 주황색 가로등만이 작은 방을 희미하게 물들인다.",
    visual: "room",
  },
  {
    scene: 1,
    place: "유나의 방 · 10:09 PM",
    speaker: "유나",
    text: "…오늘따라 비가 그치질 않네. 학원 아이들… 다들 잘 들어갔을까?",
    visual: "room",
  },
  {
    scene: 2,
    place: "TV 속보 · 10:10 PM",
    speaker: "NEWS",
    text: "[속보] ○○구 일대 고등학생 연쇄 실종… 벌써 3번째",
    visual: "tv",
    tone: "news",
  },
  {
    scene: 2,
    place: "TV 속보 · 10:10 PM",
    speaker: "아나운서",
    text: "지난달 미술학원 수강생 한 모 군에 이어, 어제 저녁 또 한 명의 고등학생이 귀가 도중 흔적도 없이 실종되었습니다.",
    visual: "tv",
    tone: "news",
  },
  {
    scene: 2,
    place: "TV 속보 · 10:10 PM",
    speaker: "아나운서",
    text: "경찰은 인근 CCTV 및 미술학원 일대를 중심으로 수사를 확대하고 있으나…",
    visual: "tv",
    tone: "news",
  },
  {
    scene: 2,
    place: "유나의 방 · 10:11 PM",
    speaker: "유나",
    text: "…또 실종이야? 벌써 세 명째잖아. 다들 우리 학원 아이들이었는데…",
    visual: "tv",
  },
  {
    scene: 3,
    place: "서아 · 10:12 PM",
    speaker: "서아",
    text: "유나야… 집에 있어?",
    visual: "phone",
    tone: "danger",
  },
  {
    scene: 3,
    place: "서아 · 10:12 PM",
    speaker: "서아",
    text: "원장님이 지하실 스터디룸에서 완벽한 ‘붉은 물감’을 완성했다고 하셨어…",
    visual: "phone",
    tone: "danger",
  },
  {
    scene: 3,
    place: "서아 · 10:13 PM",
    speaker: "서아",
    text: "근데 이상해… 물감 냄새가 아니라 피 냄새가 나…",
    visual: "phone",
    tone: "danger",
  },
  {
    scene: 3,
    place: "서아 · 10:13 PM",
    speaker: "서아",
    text: "문이 밖에서 잠겼어. 지하실 문이 안 열려… 나 좀 도와줘 유나야!!!",
    visual: "phone",
    tone: "danger",
  },
  {
    scene: 3,
    place: "통화 연결 실패",
    speaker: "유나",
    text: "서아야?! 전화를 안 받아… 대체 원장님이 밤늦게 지하실에서 뭘 하고 계신 거지…!",
    visual: "phone",
    tone: "danger",
  },
  {
    scene: 4,
    place: "무지개 미술학원 앞 · 10:27 PM",
    speaker: "",
    text: "천둥이 밤하늘을 가른다. 불 꺼진 학원의 지하 창문에서만 핏빛 조명이 새어 나온다.",
    visual: "school",
  },
  {
    scene: 4,
    place: "무지개 미술학원 앞 · 10:27 PM",
    speaker: "유나",
    text: "정문이 쇠사슬로 잠겨 있어… 하지만 옆 쪽문은 살짝 열려 있네.",
    visual: "school",
  },
  {
    scene: 4,
    place: "무지개 미술학원 앞 · 10:27 PM",
    speaker: "유나",
    text: "서아야, 기다려. 내가 지금 들어갈게.",
    visual: "school",
  },
];
function OpeningCutscene({ onComplete }: { onComplete: () => void }) {
  const [beat, setBeat] = useState(0),
    [muted, setMuted] = useState(false);
  const b = openingBeats[beat];
  useEffect(() => {
    const auto = setTimeout(
      () =>
        setBeat((v) =>
          v < openingBeats.length - 1 ? v + 1 : (onComplete(), v),
        ),
      7200,
    );
    return () => {
      clearTimeout(auto);
    };
  }, [beat, onComplete]);
  useEffect(() => {
    if (muted) return;
    let ctx: AudioContext | undefined,
      source: AudioBufferSourceNode | undefined,
      gain: GainNode | undefined;
    try {
      ctx = new AudioContext();
      const frames = ctx.sampleRate * 2,
        buffer = ctx.createBuffer(1, frames, ctx.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++)
        data[i] = (Math.random() * 2 - 1) * (0.18 + 0.08 * Math.sin(i / 91));
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      gain = ctx.createGain();
      gain.gain.value = 0.09;
      source.connect(gain).connect(ctx.destination);
      source.start();
    } catch {}
    return () => {
      try {
        source?.stop();
        ctx?.close();
      } catch {}
    };
  }, [muted]);
  const next = () =>
    beat < openingBeats.length - 1 ? setBeat((v) => v + 1) : onComplete();
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-[#f7ecd5]"
      onClick={next}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") next();
      }}
      tabIndex={0}
      autoFocus
    >
      <CutVisual kind={b.visual} scene={b.scene} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.05)_50%,rgba(0,0,0,.9))]" />
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 text-[10px] tracking-[.25em] text-white/55 sm:p-7">
        <span>OPENING · 비 내리는 밤의 초청장</span>
        <span>
          SCENE 0{b.scene} · {beat + 1}/{openingBeats.length}
        </span>
      </div>
      <div
        key={beat}
        className="cutscene-dialog absolute inset-x-0 bottom-0 z-30 p-4 sm:p-10"
      >
        <div className="opening-dialogue pixel-dialogue relative mx-auto max-w-5xl">
          <Portrait
            character={
              b.speaker === "서아"
                ? "seoa"
                : b.speaker === "NEWS" || b.speaker === "아나운서"
                  ? "announcer"
                  : "yuna"
            }
            mood={
              b.tone === "danger"
                ? "terrified"
                : b.scene >= 2
                  ? "suspicious"
                  : "neutral"
            }
          />
          <div className="pixel-dialogue-copy">
            <p className="mb-2 text-[10px] tracking-[.28em] text-amber-300">
              {b.place}
            </p>
            <b className="pixel-speaker">{b.speaker || "유나"}</b>
            <p
              className={`max-w-3xl text-sm leading-7 sm:text-lg sm:leading-9 ${b.tone === "danger" ? "cutscene-type text-red-200" : ""}`}
            >
              {b.text}
            </p>
          </div>
          <p className="mt-4 text-right text-[10px] tracking-widest text-white/40">
            클릭 / SPACE 다음 ▶
          </p>
        </div>
      </div>
      <div className="absolute right-4 top-12 z-40 flex gap-2 sm:right-7 sm:top-16">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((v) => !v);
          }}
          className="border border-white/20 bg-black/50 px-3 py-2 text-xs"
        >
          {muted ? "음소거 해제" : "음소거"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="border border-white/20 bg-black/50 px-3 py-2 text-xs"
        >
          컷씬 건너뛰기
        </button>
      </div>
    </main>
  );
}
function CutVisual({ kind }: { kind: CutBeat["visual"]; scene: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <PixelScene mode="opening" kind={kind} />
    </div>
  );
}
function TitleScreen({
  onStart,
  onLoad,
  hasSave,
}: {
  onStart: () => void;
  onLoad: () => void;
  hasSave: boolean;
}) {
  return (
    <main className="pixel-title-screen relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="relative z-10 w-full max-w-3xl text-center">
        <div className="pixel-title-emblem mx-auto mb-8 grid h-24 w-24 grid-cols-3 gap-1 border-4 border-[#f3e6c9] bg-[#eee0c1] p-3 shadow-[10px_10px_0_#57182c]">
          <i className="bg-red-500" />
          <i className="bg-amber-300" />
          <i className="bg-emerald-400" />
          <i className="bg-cyan-400" />
          <i className="bg-blue-500" />
          <i className="bg-violet-500" />
          <i className="bg-fuchsia-400" />
          <i className="bg-rose-300" />
          <i className="bg-slate-900" />
        </div>
        <p className="mb-3 text-xs tracking-[.55em] text-rose-400">
          2D PIXEL PSYCHOLOGICAL HORROR
        </p>
        <h1 className="text-4xl font-black tracking-[-.06em] text-[#fff4d9] drop-shadow-[5px_5px_0_#7e1733] sm:text-7xl">
          무지개빛
          <br />
          미술학원
        </h1>
        <p className="mt-4 font-serif text-sm tracking-[.18em] text-slate-400">
          The Rainbow Atelier
        </p>
        <p className="mx-auto mt-8 max-w-md text-sm leading-7 text-slate-300">
          사라진 동생, 일곱 가지 물감, 그리고 밤마다 들리는 젖은 붓 소리.
          <br />
          <span className="text-rose-300">
            예쁜 색은 언제나 좋은 기억에서 만들어질까?
          </span>
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={onStart}
            className="pixel-menu-button pixel-menu-pink w-64 px-7 py-4 font-black tracking-[.25em]"
          >
            새 게임
          </button>
          <button
            disabled={!hasSave}
            onClick={onLoad}
            className="pixel-menu-button pixel-menu-blue w-64 px-7 py-4 text-sm font-black tracking-[.2em]"
          >
            이어하기
          </button>
        </div>
      </div>
      <span className="absolute bottom-4 text-[10px] tracking-widest text-slate-600">
        HEADPHONES RECOMMENDED · 만 15세 이상 권장
      </span>
    </main>
  );
}
function Inventory({
  flags,
  sanity,
  craft,
  close,
}: {
  flags: Flag[];
  sanity: number;
  craft: () => void;
  close: () => void;
}) {
  const low = sanity < 30;
  const items = [
    { f: "key", n: "청동 지하실 열쇠", c: "#b98b45" },
    { f: "red", n: low ? "아직 따뜻한 심장" : "핏빛 붉은 안료", c: "#d72e49" },
    { f: "yellow", n: low ? "썩은 담낭" : "담즙의 노란 안료", c: "#d4b624" },
    { f: "blue", n: low ? "척수 한 토막" : "뇌척수액 푸른 안료", c: "#3a82d7" },
    { f: "solvent", n: "오렌지 용제", c: "#e66d28" },
    { f: "clue", n: "유진의 붉은 머리끈", c: "#a61236" },
  ];
  const canCraft =
    flags.includes("red") &&
    flags.includes("yellow") &&
    !flags.includes("solvent");
  return (
    <div
      className={`absolute inset-4 z-50 overflow-auto border-2 bg-[#101425]/95 p-6 sm:inset-8 ${low ? "border-red-500 glitch" : "border-[#d9cbaa]"}`}
    >
      <div className="flex justify-between">
        <div>
          <h2 className="text-lg font-black tracking-widest">
            가방 / INVENTORY
          </h2>
          <p className="mt-1 text-[10px] text-slate-400">
            일기{" "}
            {
              ["note", "diary2", "diary3", "diary4"].filter((d) =>
                flags.includes(d as Flag),
              ).length
            }
            /4
          </p>
        </div>
        <button onClick={close}>✕</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.f}
            className={`border border-white/15 p-4 ${flags.includes(i.f as Flag) ? "" : "opacity-20"}`}
          >
            <div
              className="mb-3 h-10 w-10 border-4 border-black/25"
              style={{ background: i.c }}
            />
            <p className="text-xs">{i.n}</p>
          </div>
        ))}
      </div>
      <button
        disabled={!canCraft}
        onClick={craft}
        className="mt-5 w-full border border-orange-400 p-3 text-sm text-orange-200 enabled:bg-orange-500/20 disabled:opacity-25"
      >
        붉은 안료 + 노란 안료 → 오렌지 용제 조합
      </button>
    </div>
  );
}
function MixingPuzzle({
  close,
  complete,
}: {
  close: () => void;
  complete: () => void;
}) {
  const [rgb, setRgb] = useState([80, 80, 80]);
  const target = [212, 143, 56];
  const ok = rgb.every((v, i) => Math.abs(v - target[i]) <= 8);
  const colors = ["R 동맥의 붉은색", "G 담즙의 노란색", "B 뇌척수액의 푸른색"];
  return (
    <div className="absolute inset-4 z-50 overflow-auto border-2 border-amber-300 bg-[#0d1020]/97 p-5 sm:inset-10">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] text-amber-300">
            B1F · RGB HUMAN PIGMENT
          </p>
          <h2 className="mt-1 text-lg font-black">인체 물감 배합기</h2>
        </div>
        <button onClick={close}>✕</button>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        연구 일지의 목표값 R212 · G143 · B56에 맞춰 각 안료 밸브를 조절하세요.
        ±8 허용
      </p>
      <div className="mt-5 grid gap-4">
        {rgb.map((v, i) => (
          <label
            key={colors[i]}
            className="grid grid-cols-[150px_1fr_42px] items-center gap-3 text-xs"
          >
            <span>{colors[i]}</span>
            <input
              aria-label={colors[i]}
              type="range"
              min="0"
              max="255"
              value={v}
              onChange={(e) =>
                setRgb((a) =>
                  a.map((n, j) => (j === i ? Number(e.target.value) : n)),
                )
              }
              className="accent-rose-500"
            />
            <b>{v}</b>
          </label>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div
          className="h-14 flex-1 border-4 border-black/30"
          style={{ background: `rgb(${rgb.join(",")})` }}
        />
        <button
          disabled={!ok}
          onClick={complete}
          className="border border-amber-300 px-5 py-4 text-sm font-black enabled:bg-amber-300 enabled:text-black disabled:opacity-30"
        >
          배합 확정
        </button>
      </div>
    </div>
  );
}
function HideQTE({ done }: { done: (success: boolean) => void }) {
  const [breath, setBreath] = useState(50),
    breathRef = useRef(50);
  const [time, setTime] = useState(5);
  const adjust = useCallback(
    (amount: number) =>
      setBreath((v) => {
        const n = Math.max(0, Math.min(100, v + amount));
        breathRef.current = n;
        return n;
      }),
    [],
  );
  useEffect(() => {
    const press = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        adjust(-12);
      }
    };
    addEventListener("keydown", press);
    const drift = setInterval(() => adjust((Math.random() - 0.47) * 24), 250);
    const clock = setInterval(
      () =>
        setTime((v) => {
          if (v <= 1) {
            clearInterval(clock);
            clearInterval(drift);
            setTimeout(
              () => done(breathRef.current > 25 && breathRef.current < 75),
              0,
            );
            return 0;
          }
          return v - 1;
        }),
      1000,
    );
    return () => {
      removeEventListener("keydown", press);
      clearInterval(drift);
      clearInterval(clock);
    };
  }, [adjust, done]);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-xs tracking-[.4em] text-red-400">
          B2F 캐비닛 · 숨을 참아
        </p>
        <h2 className="mt-3 text-2xl font-black">
          클렘에게 심장 소리를 들키지 마세요
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Space 또는 버튼으로 바늘을 안전 영역에 유지 · {time}초
        </p>
        <div className="relative mt-8 h-7 border border-white/30 bg-white/5">
          <div className="absolute inset-y-0 left-1/4 w-1/2 bg-emerald-500/25" />
          <div
            className="absolute inset-y-0 w-1 bg-white transition-all"
            style={{ left: `${breath}%` }}
          />
        </div>
        <button
          onClick={() => adjust(-12)}
          className="mt-7 rounded-full border-2 border-white/40 px-9 py-4 font-black active:bg-white active:text-black"
        >
          SPACE · 호흡 억제
        </button>
      </div>
    </div>
  );
}
function Pause({
  save,
  close,
  quit,
}: {
  save: () => void;
  close: () => void;
  quit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="w-64 border-2 border-white/40 bg-[#111426] p-6 text-center">
        <h2 className="mb-5 text-xl font-black tracking-widest">PAUSED</h2>
        <button
          onClick={close}
          className="mb-2 block w-full border border-white/20 p-2"
        >
          계속하기
        </button>
        <button
          onClick={save}
          className="mb-2 block w-full border border-amber-400/50 p-2 text-amber-300"
        >
          게임 저장
        </button>
        <button
          onClick={quit}
          className="block w-full border border-rose-400/50 p-2 text-rose-300"
        >
          타이틀로
        </button>
      </div>
    </div>
  );
}
function Dpad({ move }: { move: (d: Dir, on: boolean) => void }) {
  const B = ({ d, s }: { d: Dir; s: string }) => (
    <button
      aria-label={d}
      onPointerDown={() => move(d, true)}
      onPointerUp={() => move(d, false)}
      onPointerCancel={() => move(d, false)}
      className="h-9 w-9 border border-white/25 bg-white/10"
    >
      {s}
    </button>
  );
  return (
    <div className="grid grid-cols-3">
      <i />
      <B d="up" s="▲" />
      <i />
      <B d="left" s="◀" />
      <B d="down" s="▼" />
      <B d="right" s="▶" />
    </div>
  );
}
function Ending({
  kind,
  onAgain,
}: {
  kind: "normal" | "bad" | "true";
  onAgain: () => void;
}) {
  const data =
    kind === "true"
      ? {
          tag: "TRUE ENDING",
          title: "무지개의 진실",
          text: "유진의 머리끈이 원장의 거짓말을 무너뜨렸다. 유나는 일곱 안료에 갇힌 아이들의 기억을 해방한다.",
          bg: "bg-[#071912]",
          color: "text-emerald-300",
        }
      : kind === "normal"
        ? {
            tag: "NORMAL ENDING",
            title: "잿더미 속 탈출",
            text: "유나는 학원을 빠져나왔지만, 유진의 진실은 아직 지하에 남아 있다.",
            bg: "bg-[#0a1220]",
            color: "text-amber-300",
          }
        : {
            tag: "BAD ENDING",
            title: "영원한 물감",
            text: "광기가 유나의 이름을 지웠다. 원장의 캔버스에 새로운 푸른색이 더해졌다.",
            bg: "bg-[#180308]",
            color: "text-red-500",
          };
  return (
    <main
      className={`flex min-h-screen items-center justify-center p-6 text-center ${data.bg}`}
    >
      <div>
        <p className={`text-xs tracking-[.5em] ${data.color}`}>{data.tag}</p>
        <h1 className="mt-5 text-4xl font-black sm:text-6xl">{data.title}</h1>
        <p className="mx-auto mt-6 max-w-lg leading-8 text-slate-400">
          {data.text}
        </p>
        <button
          onClick={onAgain}
          className="mt-10 border border-white/30 px-8 py-3 hover:bg-white/10"
        >
          처음부터 다시
        </button>
      </div>
    </main>
  );
}
