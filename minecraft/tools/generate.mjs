#!/usr/bin/env node
/**
 * MythGear generator — 八神装備パック
 *
 * 参照画像(minecraft/reference/characters.png)の8キャラクターの装備を
 * バニラのデータパック + リソースパックとして生成する。
 *
 * 生成物:
 *   minecraft/mythgear_datapack/      … give関数・レシピ・進捗(レシピ解放)
 *   minecraft/mythgear_resourcepack/  … アイテム定義・モデル・テクスチャ・装備アセット
 *   minecraft/preview.png             … アイコン/装備テクスチャの確認用シート
 *
 * 実行: node minecraft/tools/generate.mjs
 * 依存: なし (Node組み込みの fs / path / zlib のみ)
 *
 * 対象バージョン: Minecraft Java 1.21.4+
 *   - item_model / equippable(asset_id) / attribute_modifiers を使用
 *   - 1.21.5 以降で構文が変わった要素(テキストコンポーネントのSNBT化、
 *     enchantments のフラット化、click_event 改名など)は使わない構成にして
 *     1.21.4〜1.21.x で共通に動く書き方に寄せている
 */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const NS = 'mythgear'
const DP = path.join(ROOT, 'mythgear_datapack')
const RP = path.join(ROOT, 'mythgear_resourcepack')

// ---------------------------------------------------------------------------
// PNGエンコーダ (RGBA 8bit, 無圧縮フィルタ0 + deflate)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngEncode(canvas) {
  const { w, h, data } = canvas
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const chunk = (type, body) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(body.length)
    const t = Buffer.from(type, 'latin1')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, body])))
    return Buffer.concat([len, t, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------------------------------------------------------------------------
// 描画ユーティリティ
// ---------------------------------------------------------------------------

function hex(s) {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s)
  if (!m) throw new Error(`bad color: ${s}`)
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, m[2] ? parseInt(m[2], 16) : 255]
}

class Canvas {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = Buffer.alloc(w * h * 4)
  }
  set(x, y, rgba) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    this.data[i] = rgba[0]
    this.data[i + 1] = rgba[1]
    this.data[i + 2] = rgba[2]
    this.data[i + 3] = rgba[3]
  }
  get(x, y) {
    const i = (y * this.w + x) * 4
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]]
  }
  fill(rgba) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, rgba)
  }
  rect(x, y, w, h, rgba) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, rgba)
  }
  outline(x, y, w, h, rgba) {
    for (let xx = x; xx < x + w; xx++) {
      this.set(xx, y, rgba)
      this.set(xx, y + h - 1, rgba)
    }
    for (let yy = y; yy < y + h; yy++) {
      this.set(x, yy, rgba)
      this.set(x + w - 1, yy, rgba)
    }
  }
  blitScaled(src, dx, dy, scale) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y)
        if (c[3] === 0) continue
        this.rect(dx + x * scale, dy + y * scale, scale, scale, c)
      }
  }
}

/** ASCIIアートをキャンバスへ描画。'.'と' 'は透過。 */
function drawSprite(canvas, ox, oy, rows, palette) {
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return
      const c = palette[ch]
      if (!c) throw new Error(`palette missing '${ch}' (row ${y})`)
      canvas.set(ox + x, oy + y, hex(c))
    })
  })
}

function spriteCanvas(rows, palette, w = 16, h = 16) {
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`sprite row ${i} has width ${r.length}, expected ${w}: "${r}"`)
  })
  if (rows.length !== h) throw new Error(`sprite has ${rows.length} rows, expected ${h}`)
  const c = new Canvas(w, h)
  drawSprite(c, 0, 0, rows, palette)
  return c
}

/** 左半分(8列)を左右対称に展開して16列にする */
function mirror(rows) {
  return rows.map((r) => r + [...r].reverse().join(''))
}

// ---------------------------------------------------------------------------
// アイテムアイコン (16x16)
// ---------------------------------------------------------------------------

const ICONS = {}

// 壱 — 魔翼(コウモリ翼・紫) : 左上のサキュバス風キャラ
ICONS.demon_wings = spriteCanvas(
  mirror([
    'D.......',
    'DD......',
    'DPD.....',
    'DPPD....',
    'DPLPD...',
    '.DPLPD..',
    '.DPLLPD.',
    '..DPLLPD',
    '..DPLHLP',
    '...DPLHL',
    '...DPPLH',
    '....DPPL',
    '....DPDP',
    '.....D.D',
    '......D.',
    '........',
  ]),
  { D: '#2a1140', P: '#8a3fc6', L: '#b877e8', H: '#e0b3ff' },
)

// 弐 — 覇王の大剣(青紫の大剣) : 上段中央の剣士
ICONS.hero_greatsword = (() => {
  const c = new Canvas(16, 16)
  const D = hex('#20264a')
  const W = hex('#eef2fc')
  const S = hex('#93a7dc')
  const B = hex('#5f79c4')
  const G = hex('#e8b53a')
  const P = hex('#5a3f8f')
  const J = hex('#54c8e8')
  // 刃 (右上→左下)。進行方向(-1,+1)に対し垂直方向(+1,+1)へ3px幅で塗る
  for (let i = 0; i < 9; i++) {
    const x = 13 - i
    const y = 2 + i
    c.set(x - 2, y - 2, D)
    c.set(x - 1, y - 1, W)
    c.set(x, y, S)
    c.set(x + 1, y + 1, B)
    c.set(x + 2, y + 2, D)
  }
  // 切っ先
  c.set(14, 1, W)
  c.set(15, 0, D)
  c.set(14, 0, D)
  c.set(15, 1, D)
  c.set(13, 0, D)
  c.set(15, 2, D)
  // 鍔(刃の根元を横切る黄金の棒)
  c.set(1, 8, D)
  c.set(2, 9, G)
  c.set(3, 10, G)
  c.set(4, 11, G)
  c.set(5, 12, G)
  c.set(6, 13, G)
  c.set(7, 14, D)
  c.set(2, 8, D)
  c.set(3, 9, D)
  c.set(1, 9, D)
  c.set(2, 10, D)
  c.set(5, 13, D)
  c.set(6, 12, D)
  c.set(6, 14, D)
  c.set(7, 13, D)
  // 柄と宝玉
  c.set(3, 12, P)
  c.set(2, 13, P)
  c.set(1, 14, J)
  c.set(0, 13, D)
  c.set(1, 13, D)
  c.set(2, 12, D)
  c.set(3, 13, D)
  c.set(2, 14, D)
  c.set(0, 14, D)
  c.set(1, 15, D)
  c.set(0, 15, D)
  c.set(2, 15, D)
  return c
})()

// 参 — 月兎の頭巾(白いフード+うさ耳) : 右上の白髪キャラ
ICONS.moon_rabbit_hood = spriteCanvas(
  [
    '..DD......DD....',
    '.DWWD....DWWD...',
    '.DWKWD..DWKWD...',
    '.DWKWD..DWKWD...',
    '..DWWDDDDWWD....',
    '..DWWWWWWWWD....',
    '.DWWWWWWWWWWD...',
    '.DWGGGGGGGGWD...',
    '.DWNNNNNNNNWD...',
    '.DwNNNNNNNNwD...',
    '.DwNNNNNNNNwD...',
    '.DwWNNNNNNWwD...',
    '..DwWWWWWWwD....',
    '..DwwWWWWwwD....',
    '...DDwwwwDD.....',
    '.....DDDD.......',
  ],
  {
    D: '#4a4038',
    W: '#f6f4ef',
    w: '#d9d4c9',
    K: '#f0a8bc',
    G: '#e8b53a',
    N: '#3a332c',
  },
)

// 肆 — 黄金の投げ縄(コイル状のロープ) : 中段左の茶髪キャラ
ICONS.golden_lasso = spriteCanvas(
  [
    '................',
    '....DDDDDD......',
    '..DDGHHHHGDD....',
    '.DGHHGGGGHHGD...',
    '.DGHGDDDDGHGD...',
    'DGHGD....DGHGD..',
    'DGHD......DHGD..',
    'DGHD......DHGD..',
    'DGHGD....DGHGD..',
    '.DGHGDDDDGHGD...',
    '.DSGHHGGHHGSD...',
    '..DDSGGGGSDD....',
    '....DDDDDD.S....',
    '..........DSD...',
    '...........DSD..',
    '............D...',
  ],
  { D: '#5d3f14', G: '#d9a441', H: '#f0cd6e', S: '#9c6b23' },
)

// 伍 — 蛾神の羽(紺色の蛾の翅) : 中段右の蛾の女神
ICONS.moth_wings = (() => {
  const c = spriteCanvas(
    mirror([
      '.DDD....',
      'DBBBD...',
      'DBLBBD..',
      'DBLLBBD.',
      '.DBLLLBD',
      '.DBCCLBB',
      '..DBCCLB',
      '..DBBLLB',
      '...DBLTB',
      '...DBTTB',
      '....DBTB',
      '....DBTB',
      '.....DBB',
      '.....DB.',
      '......D.',
      '........',
    ]),
    { D: '#131a38', B: '#3d4f94', L: '#6a7fc4', C: '#cfeee6', T: '#46b8a8' },
  )
  // 中央の胴体と触角
  const D = hex('#131a38')
  const F = hex('#8a97c9')
  c.set(7, 3, F)
  c.set(8, 3, F)
  c.set(7, 2, D)
  c.set(8, 2, D)
  c.set(6, 1, D)
  c.set(9, 1, D)
  for (let y = 4; y <= 11; y++) {
    c.set(7, y, D)
    c.set(8, y, D)
  }
  return c
})()

// 陸 — 緋薔薇の羽織(白地に薔薇色のV襟・金帯・緋色の裾) : 下段左の紅髪キャラ
ICONS.rose_robe = spriteCanvas(
  [
    '...DDDDDDDDDD...',
    '..DWRWDWWDRWWD..',
    '..DWRWWWWWWRWD..',
    '..DWWRWWWWRWWD..',
    '..DWWRWWWWRWWD..',
    '..DWWWRRRRWWWD..',
    '..DGGGGGGGGGGD..',
    '..DGPPGGGGPPGD..',
    '..DWWWWWWWWWWD..',
    '..DwWWWWWWWWwD..',
    '..DwWWWWWWWWwD..',
    '..DwWWWWWWWWwD..',
    '..DRrWWWWWWrRD..',
    '..DRRrrrrrrRRD..',
    '..DDDDDDDDDDDD..',
    '................',
  ],
  {
    D: '#4a3038',
    W: '#f4f0e8',
    w: '#dcd6ca',
    R: '#c8506e',
    r: '#8e3450',
    G: '#e8b53a',
    P: '#f0a8bc',
  },
)

// 漆 — 太陽神の宝冠(金冠+碧玉) : 下段中央のエジプト風キャラ
ICONS.sun_crown = spriteCanvas(
  [
    '................',
    '......DTD.......',
    '.....DTTTD......',
    '......DTD.......',
    '.D....DHD....D..',
    '.DHD..DHD..DHD..',
    '.DHHD.DHD.DHHD..',
    '.DHGHDDHDDHGHD..',
    '.DGGHGHHHGHGGD..',
    '.DGGGGGGGGGGGD..',
    '.DGRGGGTGGGRGD..',
    '.DGGGGGGGGGGGD..',
    '.DSSGGGGGGGSSD..',
    '..DSSSSSSSSSD...',
    '...DDDDDDDDD....',
    '................',
  ],
  {
    D: '#5d4210',
    G: '#e8b53a',
    H: '#f6d976',
    S: '#a8791f',
    T: '#3fc9c2',
    R: '#d84a5f',
  },
)

// 捌 — 髑髏の呪杖(骨の頭飾りの杖) : 下段右の呪術師
ICONS.skull_staff = spriteCanvas(
  [
    '.....DDDD.......',
    '....DBBBBD......',
    '...DBBBBBBD.....',
    '...DBEBBEBD.....',
    '...DBBBBBBD.....',
    '....DbEEbD......',
    '.....DbbD.......',
    '......DWD.......',
    '.....DWwD.......',
    '.....DPwD.......',
    '.....DPwD.......',
    '.....DWwD.......',
    '.....DWwD.......',
    '.....DWwD.......',
    '.....DwD........',
    '......D.........',
  ],
  {
    D: '#2e2318',
    B: '#f2efe2',
    b: '#cfc9b4',
    E: '#241c14',
    W: '#7a5233',
    w: '#5a3a26',
    P: '#8a4fc0',
  },
)

// ---------------------------------------------------------------------------
// 装備テクスチャ (着用時の見た目)
// ---------------------------------------------------------------------------

/**
 * エリトラ型レイヤー (64x32)。
 * バニラのElytraModelは texOffs(22,0) / box 10x20x2 なので
 * 上面(24..43,0..1)・側面/正面/背面(22..45,2..21) を塗る。
 * 主に見えるのは front(24..33) と back(36..45)。
 */
function wingTexture({ membrane, membraneLight, rib, edge, spots, scallop }) {
  const c = new Canvas(64, 32)
  const mem = hex(membrane)
  const memL = hex(membraneLight)
  const rb = hex(rib)
  const ed = hex(edge)
  // 箱全面をベース色で塗る
  c.rect(24, 0, 20, 2, ed) // top/bottom
  c.rect(22, 2, 24, 20, mem) // 側面+正面+背面
  // 正面/背面に縦グラデーションとリブ(骨)を描く
  for (const x0 of [24, 36]) {
    for (let y = 2; y < 22; y++) {
      for (let x = x0; x < x0 + 10; x++) {
        if (y < 8 && (x + y) % 3 === 0) c.set(x, y, memL)
      }
    }
    for (const rx of [x0 + 1, x0 + 4, x0 + 7]) {
      for (let y = 2; y < 22; y++) c.set(rx, y, rb)
    }
    // 外周を締める
    for (let y = 2; y < 22; y++) {
      c.set(x0, y, ed)
      c.set(x0 + 9, y, ed)
    }
    for (let x = x0; x < x0 + 10; x++) c.set(x, 2, ed)
    if (scallop) {
      // コウモリ翼のスカラップ(下端の切れ込みを透過で表現)
      const t = [0, 0, 0, 0]
      for (const nx of [x0 + 2, x0 + 3, x0 + 6, x0 + 7]) c.set(nx, 21, t)
      for (const nx of [x0 + 2, x0 + 6]) c.set(nx, 20, t)
      for (let x = x0; x < x0 + 10; x++) if (c.get(x, 21)[3] !== 0) c.set(x, 21, ed)
    } else {
      for (let x = x0; x < x0 + 10; x++) c.set(x, 21, ed)
    }
    if (spots) {
      // 蛾の翅の紋様
      const sp = hex(spots)
      for (const [sx, sy] of [
        [x0 + 3, 6],
        [x0 + 6, 10],
        [x0 + 3, 14],
      ]) {
        c.set(sx, sy, sp)
        c.set(sx + 1, sy, sp)
        c.set(sx, sy + 1, sp)
        c.set(sx + 1, sy + 1, sp)
      }
    }
  }
  // 側面(厚み)を暗く
  c.rect(22, 2, 2, 20, ed)
  c.rect(34, 2, 2, 20, ed)
  return c
}

/**
 * 人型レイヤー (64x32, 旧armor layer_1形式)。
 * drawFn(c, uv) で各部位に描く。
 */
function humanoidTexture(drawFn) {
  const c = new Canvas(64, 32)
  const uv = {
    // 頭 (box 8x8x8 @ (0,0))
    head: {
      top: [8, 0, 8, 8],
      bottom: [16, 0, 8, 8],
      right: [0, 8, 8, 8],
      front: [8, 8, 8, 8],
      left: [16, 8, 8, 8],
      back: [24, 8, 8, 8],
    },
    // 胴 (box 8x12x4 @ (16,16))
    body: {
      top: [20, 16, 8, 4],
      right: [16, 20, 4, 12],
      front: [20, 20, 8, 12],
      left: [28, 20, 4, 12],
      back: [32, 20, 8, 12],
    },
    // 腕 (box 4x12x4 @ (40,16)) — 左腕は反転流用される
    arm: {
      top: [44, 16, 4, 4],
      right: [40, 20, 4, 12],
      front: [44, 20, 4, 12],
      left: [48, 20, 4, 12],
      back: [52, 20, 4, 12],
    },
  }
  drawFn(c, uv)
  return c
}

const EQUIP_TEXTURES = {}

EQUIP_TEXTURES['wings/demon_wings'] = wingTexture({
  membrane: '#8a3fc6',
  membraneLight: '#b877e8',
  rib: '#4d1d78',
  edge: '#2a1140',
  scallop: true,
})

EQUIP_TEXTURES['wings/moth_wings'] = wingTexture({
  membrane: '#3d4f94',
  membraneLight: '#6a7fc4',
  rib: '#26305c',
  edge: '#131a38',
  spots: '#cfeee6',
})

// 月兎の頭巾 — 頭部全体を白いフードで包み、正面に顔の開口部、金の額飾り
EQUIP_TEXTURES['humanoid/moon_rabbit_hood'] = humanoidTexture((c, uv) => {
  const W = hex('#f6f4ef')
  const w = hex('#d9d4c9')
  const K = hex('#f0a8bc')
  const G = hex('#e8b53a')
  const D = hex('#b8b2a6')
  for (const face of ['top', 'bottom', 'right', 'front', 'left', 'back']) {
    const [x, y, fw, fh] = uv.head[face]
    c.rect(x, y, fw, fh, face === 'right' || face === 'left' ? w : W)
  }
  // 正面: 顔の開口部(透過) + 金の額飾り
  {
    const [x, y] = uv.head.front
    for (let yy = y + 2; yy < y + 8; yy++)
      for (let xx = x + 1; xx < x + 7; xx++) c.set(xx, yy, [0, 0, 0, 0])
    c.rect(x, y + 1, 8, 1, G)
    c.set(x + 3, y, K)
    c.set(x + 4, y, K)
  }
  // 上面: うさ耳の付け根(ピンクの楕円2つ)
  {
    const [x, y] = uv.head.top
    c.rect(x + 1, y + 1, 2, 4, K)
    c.rect(x + 5, y + 1, 2, 4, K)
    c.outline(x, y, 8, 8, w)
  }
  // 背面: ピンクのリボン風の飾り
  {
    const [x, y] = uv.head.back
    c.rect(x + 3, y + 3, 2, 2, K)
    c.set(x + 2, y + 2, K)
    c.set(x + 5, y + 2, K)
    c.set(x + 2, y + 5, K)
    c.set(x + 5, y + 5, K)
    c.rect(x, y + 7, 8, 1, D)
  }
  // 側面下端に影
  for (const face of ['right', 'left']) {
    const [x, y, fw] = uv.head[face]
    c.rect(x, y + 7, fw, 1, D)
  }
})

// 太陽神の宝冠 — 金の環+正面の碧玉、上面に縁取り
EQUIP_TEXTURES['humanoid/sun_crown'] = humanoidTexture((c, uv) => {
  const G = hex('#e8b53a')
  const H = hex('#f6d976')
  const S = hex('#a8791f')
  const T = hex('#3fc9c2')
  const R = hex('#d84a5f')
  for (const face of ['right', 'front', 'left', 'back']) {
    const [x, y, fw] = uv.head[face]
    // 額の高さに金の環(3px)
    c.rect(x, y + 1, fw, 1, H)
    c.rect(x, y + 2, fw, 1, G)
    c.rect(x, y + 3, fw, 1, S)
    // ギザギザの山
    for (let xx = x; xx < x + fw; xx += 2) c.set(xx, y, G)
  }
  // 正面中央の碧玉と両脇の紅玉
  {
    const [x, y] = uv.head.front
    c.set(x + 3, y + 1, T)
    c.set(x + 4, y + 1, T)
    c.set(x + 3, y + 2, T)
    c.set(x + 4, y + 2, T)
    c.set(x + 1, y + 2, R)
    c.set(x + 6, y + 2, R)
  }
  // 上面: 冠の縁
  {
    const [x, y] = uv.head.top
    c.outline(x, y, 8, 8, G)
  }
})

// 緋薔薇の羽織 — 白地・薔薇色の襟と裾・金帯・ピンクの帯結び
EQUIP_TEXTURES['humanoid/rose_robe'] = humanoidTexture((c, uv) => {
  const W = hex('#f4f0e8')
  const w = hex('#dcd6ca')
  const R = hex('#c8506e')
  const r = hex('#8e3450')
  const G = hex('#e8b53a')
  const P = hex('#f0a8bc')
  // 胴体
  for (const face of ['top', 'right', 'front', 'left', 'back']) {
    const [x, y, fw, fh] = uv.body[face]
    c.rect(x, y, fw, fh, face === 'right' || face === 'left' ? w : W)
  }
  {
    const [x, y, fw, fh] = uv.body.front
    // 打ち合わせの襟(V字)
    c.set(x + 2, y, R)
    c.set(x + 5, y, R)
    c.set(x + 2, y + 1, R)
    c.set(x + 5, y + 1, R)
    c.set(x + 3, y + 2, R)
    c.set(x + 4, y + 2, R)
    c.set(x + 3, y + 3, r)
    c.set(x + 4, y + 3, r)
    // 金帯 + ピンクの帯結び
    c.rect(x, y + 6, fw, 1, G)
    c.rect(x + 2, y + 7, 4, 2, P)
    // 裾
    c.rect(x, y + fh - 1, fw, 1, R)
    c.rect(x, y + fh - 2, fw, 1, r)
  }
  {
    const [x, y, fw, fh] = uv.body.back
    c.rect(x, y + 6, fw, 1, G)
    c.rect(x, y + fh - 1, fw, 1, R)
    c.rect(x, y + fh - 2, fw, 1, r)
  }
  for (const face of ['right', 'left']) {
    const [x, y, fw, fh] = uv.body[face]
    c.rect(x, y + 6, fw, 1, G)
    c.rect(x, y + fh - 1, fw, 1, R)
  }
  // 袖 — 白地に薔薇色のカフス
  for (const face of ['top', 'right', 'front', 'left', 'back']) {
    const [x, y, fw, fh] = uv.arm[face]
    c.rect(x, y, fw, fh, face === 'right' || face === 'left' ? w : W)
  }
  for (const face of ['right', 'front', 'left', 'back']) {
    const [x, y, fw, fh] = uv.arm[face]
    c.rect(x, y + fh - 2, fw, 1, R)
    c.rect(x, y + fh - 1, fw, 1, r)
    c.rect(x, y + fh - 3, fw, 1, G)
  }
})

// ---------------------------------------------------------------------------
// アイテム定義 (この表が全ての生成元)
// ---------------------------------------------------------------------------

const attr = (itemId, name, type, amount, operation, slot) => ({
  id: `${NS}:${itemId}/${name}`,
  type,
  amount,
  operation,
  slot,
})

const ITEMS = [
  {
    id: 'demon_wings',
    base: 'minecraft:elytra',
    name: '魔翼『ノクスウィング』',
    rarity: 'epic',
    lore: ['《八神装備・壱》', '宵闇の魔女が背負う蝙蝠の翼。', '身に着ければ夜空を滑空できる。'],
    model: 'generated',
    equippable: { slot: 'chest', asset: 'demon_wings', sound: 'minecraft:item.armor.equip_elytra' },
    attributes: [attr('demon_wings', 'armor', 'minecraft:armor', 3, 'add_value', 'chest')],
    recipe: {
      pattern: [' A ', 'PEP', ' O '],
      key: {
        A: 'minecraft:amethyst_shard',
        P: 'minecraft:phantom_membrane',
        E: 'minecraft:elytra',
        O: 'minecraft:obsidian',
      },
    },
  },
  {
    id: 'hero_greatsword',
    base: 'minecraft:netherite_sword',
    name: '覇王大剣『ドラグヴェイン』',
    rarity: 'epic',
    lore: ['《八神装備・弐》', '竜殺しの伝説を宿す蒼き大剣。', '一振りで戦局を変える。'],
    model: 'handheld',
    attributes: [
      { id: 'minecraft:base_attack_damage', type: 'minecraft:attack_damage', amount: 11, operation: 'add_value', slot: 'mainhand' },
      { id: 'minecraft:base_attack_speed', type: 'minecraft:attack_speed', amount: -2.9, operation: 'add_value', slot: 'mainhand' },
    ],
    extraComponents: { 'minecraft:enchantment_glint_override': true },
    recipe: {
      pattern: [' D ', 'DSD', ' G '],
      key: { D: 'minecraft:diamond', S: 'minecraft:netherite_sword', G: 'minecraft:gold_ingot' },
    },
  },
  {
    id: 'moon_rabbit_hood',
    base: 'minecraft:leather_helmet',
    name: '月兎の頭巾『ルナミミ』',
    rarity: 'rare',
    lore: ['《八神装備・参》', '月の兎神が編んだ純白の頭巾。', '高所から跳んでも怖くない。'],
    model: 'generated',
    equippable: { slot: 'head', asset: 'moon_rabbit_hood', sound: 'minecraft:item.armor.equip_leather' },
    attributes: [
      attr('moon_rabbit_hood', 'armor', 'minecraft:armor', 2, 'add_value', 'head'),
      attr('moon_rabbit_hood', 'safe_fall', 'minecraft:safe_fall_distance', 4, 'add_value', 'head'),
      attr('moon_rabbit_hood', 'jump', 'minecraft:jump_strength', 0.08, 'add_value', 'head'),
    ],
    extraComponents: { 'minecraft:max_damage': 240 },
    recipe: {
      pattern: ['WWW', 'WHW', ' G '],
      key: { W: 'minecraft:white_wool', H: 'minecraft:leather_helmet', G: 'minecraft:gold_ingot' },
    },
  },
  {
    id: 'golden_lasso',
    base: 'minecraft:lead',
    name: '黄金の投げ縄『ソルレイド』',
    rarity: 'rare',
    lore: ['《八神装備・肆》', '怪力の狩神が振り回した黄金の縄。', '打った相手を大きく弾き飛ばす。'],
    model: 'handheld',
    attributes: [
      attr('golden_lasso', 'knockback', 'minecraft:attack_knockback', 2, 'add_value', 'mainhand'),
      attr('golden_lasso', 'damage', 'minecraft:attack_damage', 2, 'add_value', 'mainhand'),
    ],
    extraComponents: { 'minecraft:max_stack_size': 1 },
    recipe: {
      pattern: ['GGG', 'GLG', 'GGG'],
      key: { G: 'minecraft:gold_nugget', L: 'minecraft:lead' },
    },
  },
  {
    id: 'moth_wings',
    base: 'minecraft:elytra',
    name: '蛾神の羽『モスヴェール』',
    rarity: 'epic',
    lore: ['《八神装備・伍》', '燐粉きらめく夜蛾の女神の翅。', '軽やかに、どこまでも速く。'],
    model: 'generated',
    equippable: { slot: 'chest', asset: 'moth_wings', sound: 'minecraft:item.armor.equip_elytra' },
    attributes: [
      attr('moth_wings', 'armor', 'minecraft:armor', 2, 'add_value', 'chest'),
      attr('moth_wings', 'speed', 'minecraft:movement_speed', 0.1, 'add_multiplied_total', 'chest'),
    ],
    recipe: {
      pattern: [' L ', 'PEP', ' K '],
      key: {
        L: 'minecraft:lapis_lazuli',
        P: 'minecraft:phantom_membrane',
        E: 'minecraft:elytra',
        K: 'minecraft:glow_ink_sac',
      },
    },
  },
  {
    id: 'rose_robe',
    base: 'minecraft:leather_chestplate',
    name: '緋薔薇の羽織『ロゼクロス』',
    rarity: 'rare',
    lore: ['《八神装備・陸》', '緋色の髪の武神がまとう白い羽織。', '着る者の命を大きく護る。'],
    model: 'generated',
    equippable: { slot: 'chest', asset: 'rose_robe', sound: 'minecraft:item.armor.equip_leather' },
    attributes: [
      attr('rose_robe', 'armor', 'minecraft:armor', 5, 'add_value', 'chest'),
      attr('rose_robe', 'health', 'minecraft:max_health', 4, 'add_value', 'chest'),
    ],
    extraComponents: { 'minecraft:max_damage': 384 },
    recipe: {
      pattern: ['W W', 'RCR', 'GWG'],
      key: {
        W: 'minecraft:white_wool',
        R: 'minecraft:red_wool',
        C: 'minecraft:leather_chestplate',
        G: 'minecraft:gold_ingot',
      },
    },
  },
  {
    id: 'sun_crown',
    base: 'minecraft:golden_helmet',
    name: '太陽神の宝冠『ソルクラウン』',
    rarity: 'epic',
    lore: ['《八神装備・漆》', '太陽神の額に輝く黄金の冠。', '身に着ける者に幸運を授ける。'],
    model: 'generated',
    equippable: { slot: 'head', asset: 'sun_crown', sound: 'minecraft:item.armor.equip_gold' },
    attributes: [
      attr('sun_crown', 'armor', 'minecraft:armor', 3, 'add_value', 'head'),
      attr('sun_crown', 'luck', 'minecraft:luck', 1, 'add_value', 'head'),
    ],
    extraComponents: { 'minecraft:enchantment_glint_override': true },
    recipe: {
      pattern: ['GDG', 'GHG'],
      key: { G: 'minecraft:gold_ingot', D: 'minecraft:diamond', H: 'minecraft:golden_helmet' },
    },
  },
  {
    id: 'skull_staff',
    base: 'minecraft:blaze_rod',
    name: '髑髏の呪杖『ネクロロッド』',
    rarity: 'epic',
    lore: ['《八神装備・捌》', '髑髏を戴く呪術師の杖。', '長い間合いから呪いを叩き込む。'],
    model: 'handheld',
    attributes: [
      { id: 'minecraft:base_attack_damage', type: 'minecraft:attack_damage', amount: 6, operation: 'add_value', slot: 'mainhand' },
      { id: 'minecraft:base_attack_speed', type: 'minecraft:attack_speed', amount: -1.6, operation: 'add_value', slot: 'mainhand' },
      attr('skull_staff', 'reach', 'minecraft:entity_interaction_range', 1, 'add_value', 'mainhand'),
    ],
    extraComponents: { 'minecraft:max_stack_size': 1, 'minecraft:enchantment_glint_override': true },
    recipe: {
      pattern: ['K', 'B', 'G'],
      key: { K: 'minecraft:wither_skeleton_skull', B: 'minecraft:blaze_rod', G: 'minecraft:gold_ingot' },
    },
  },
]

// ---------------------------------------------------------------------------
// コンポーネント組み立て (give用SNBTとレシピ用JSONで共用)
// ---------------------------------------------------------------------------

function componentsOf(item) {
  const comps = {
    'minecraft:item_name': item.name,
    'minecraft:rarity': item.rarity,
    'minecraft:lore': item.lore,
    'minecraft:item_model': `${NS}:${item.id}`,
  }
  if (item.equippable) {
    comps['minecraft:equippable'] = {
      slot: item.equippable.slot,
      asset_id: `${NS}:${item.equippable.asset}`,
      equip_sound: item.equippable.sound,
    }
  }
  if (item.attributes) comps['minecraft:attribute_modifiers'] = item.attributes
  Object.assign(comps, item.extraComponents ?? {})
  return comps
}

/** SNBT化 (文字列は全てダブルクォート、booleanと数値は素のまま) */
function snbt(v) {
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.map(snbt).join(',')}]`
  return `{${Object.entries(v)
    .map(([k, val]) => `${/^[A-Za-z0-9_]+$/.test(k) ? k : JSON.stringify(k)}:${snbt(val)}`)
    .join(',')}}`
}

function giveCommand(item) {
  const comps = componentsOf(item)
  const parts = Object.entries(comps).map(([k, v]) => `${k}=${snbt(v)}`)
  return `give @s ${item.base}[${parts.join(',')}]`
}

// ---------------------------------------------------------------------------
// ファイル出力
// ---------------------------------------------------------------------------

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  console.log('  wrote', path.relative(ROOT, file))
}

const json = (o) => JSON.stringify(o, null, 2) + '\n'

console.log('== MythGear generate ==')

// 既存の生成物を消して作り直す
for (const dir of [DP, RP]) fs.rmSync(dir, { recursive: true, force: true })

// ---- データパック ----------------------------------------------------------

write(
  path.join(DP, 'pack.mcmeta'),
  json({
    pack: {
      pack_format: 61,
      supported_formats: { min_inclusive: 61, max_inclusive: 9999 },
      description: 'MythGear — 八神装備パック (give関数とレシピ)',
    },
  }),
)

write(
  path.join(DP, 'data', 'minecraft', 'tags', 'function', 'load.json'),
  json({ values: [`${NS}:load`] }),
)

write(
  path.join(DP, 'data', NS, 'function', 'load.mcfunction'),
  [
    `# MythGear 読み込み時の案内`,
    `tellraw @a [{"text":"[MythGear] ","color":"gold","bold":true},{"text":"八神装備パックを読み込みました。","color":"gray"}]`,
    `tellraw @a [{"text":"  /function ${NS}:give/all ","color":"aqua"},{"text":"で全装備を入手できます。","color":"gray"}]`,
    '',
  ].join('\n'),
)

for (const item of ITEMS) {
  write(
    path.join(DP, 'data', NS, 'function', 'give', `${item.id}.mcfunction`),
    [
      `# ${item.name}`,
      giveCommand(item),
      `tellraw @s [{"text":"[MythGear] ","color":"gold"},{"text":${JSON.stringify(item.name)},"color":"light_purple"},{"text":" を入手しました。","color":"gray"}]`,
      '',
    ].join('\n'),
  )

  write(
    path.join(DP, 'data', NS, 'recipe', `${item.id}.json`),
    json({
      type: 'minecraft:crafting_shaped',
      category: 'equipment',
      pattern: item.recipe.pattern,
      key: item.recipe.key,
      result: { id: item.base, count: 1, components: componentsOf(item) },
    }),
  )
}

write(
  path.join(DP, 'data', NS, 'function', 'give', 'all.mcfunction'),
  [
    '# 八神装備を一括入手',
    ...ITEMS.map((i) => `function ${NS}:give/${i.id}`),
    '',
  ].join('\n'),
)

// レシピブックに常時登録するための隠し進捗
write(
  path.join(DP, 'data', NS, 'advancement', 'unlock_recipes.json'),
  json({
    criteria: { always: { trigger: 'minecraft:tick' } },
    rewards: { recipes: ITEMS.map((i) => `${NS}:${i.id}`) },
  }),
)

// ---- リソースパック --------------------------------------------------------

write(
  path.join(RP, 'pack.mcmeta'),
  json({
    pack: {
      pack_format: 46,
      supported_formats: { min_inclusive: 46, max_inclusive: 9999 },
      description: 'MythGear — 八神装備パック (モデルとテクスチャ)',
    },
  }),
)

for (const item of ITEMS) {
  // アイテム定義 (items/) → モデル (models/item/) → テクスチャ (textures/item/)
  write(
    path.join(RP, 'assets', NS, 'items', `${item.id}.json`),
    json({ model: { type: 'minecraft:model', model: `${NS}:item/${item.id}` } }),
  )
  write(
    path.join(RP, 'assets', NS, 'models', 'item', `${item.id}.json`),
    json({
      parent: item.model === 'handheld' ? 'minecraft:item/handheld' : 'minecraft:item/generated',
      textures: { layer0: `${NS}:item/${item.id}` },
    }),
  )
  write(path.join(RP, 'assets', NS, 'textures', 'item', `${item.id}.png`), pngEncode(ICONS[item.id]))
}

// 装備アセット (着用時モデル)
const EQUIP_DEFS = {
  demon_wings: { layers: { wings: [{ texture: `${NS}:demon_wings` }] } },
  moth_wings: { layers: { wings: [{ texture: `${NS}:moth_wings` }] } },
  moon_rabbit_hood: { layers: { humanoid: [{ texture: `${NS}:moon_rabbit_hood` }] } },
  sun_crown: { layers: { humanoid: [{ texture: `${NS}:sun_crown` }] } },
  rose_robe: { layers: { humanoid: [{ texture: `${NS}:rose_robe` }] } },
}
for (const [id, def] of Object.entries(EQUIP_DEFS)) {
  write(path.join(RP, 'assets', NS, 'equipment', `${id}.json`), json(def))
}
for (const [rel, canvas] of Object.entries(EQUIP_TEXTURES)) {
  write(
    path.join(RP, 'assets', NS, 'textures', 'entity', 'equipment', `${rel}.png`),
    pngEncode(canvas),
  )
}

// pack.png (太陽神の宝冠を拡大)
{
  const icon = new Canvas(64, 64)
  icon.fill(hex('#2b2233'))
  icon.outline(0, 0, 64, 64, hex('#4d3a66'))
  icon.blitScaled(ICONS.sun_crown, 0, 0, 4)
  const png = pngEncode(icon)
  write(path.join(DP, 'pack.png'), png)
  write(path.join(RP, 'pack.png'), png)
}

// ---- プレビューシート ------------------------------------------------------

{
  const scale = 8
  const cell = 16 * scale + 16
  const cols = 4
  const iconRows = 2
  const eqScale = 4
  const eqW = 64 * eqScale
  const eqH = 32 * eqScale
  const eqPerRow = 2
  const eqEntries = Object.entries(EQUIP_TEXTURES)
  const eqRows = Math.ceil(eqEntries.length / eqPerRow)
  const w = Math.max(cols * cell + 16, eqPerRow * (eqW + 16) + 16)
  const h = iconRows * cell + 16 + eqRows * (eqH + 16) + 16
  const sheet = new Canvas(w, h)
  sheet.fill(hex('#241d2e'))
  ITEMS.forEach((item, i) => {
    const x = 16 + (i % cols) * cell
    const y = 16 + Math.floor(i / cols) * cell
    sheet.outline(x - 4, y - 4, 16 * scale + 8, 16 * scale + 8, hex('#4d3a66'))
    sheet.blitScaled(ICONS[item.id], x, y, scale)
  })
  eqEntries.forEach(([rel, canvas], i) => {
    const x = 16 + (i % eqPerRow) * (eqW + 16)
    const y = iconRows * cell + 32 + Math.floor(i / eqPerRow) * (eqH + 16)
    sheet.outline(x - 2, y - 2, eqW + 4, eqH + 4, hex('#4d3a66'))
    sheet.blitScaled(canvas, x, y, eqScale)
  })
  write(path.join(ROOT, 'preview.png'), pngEncode(sheet))
}

console.log('done.')
