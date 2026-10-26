import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function paint(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = (x - center) / size;
      const ny = (y - center) / size;
      let red = 18;
      let green = 22;
      let blue = 28;
      const ring = Math.hypot(nx, ny);
      if (ring > 0.34 && ring < 0.4) {
        red = 224;
        green = 161;
        blue = 92;
      }
      const peak = Math.abs(nx) * 0.95;
      if (ny > peak - 0.26 && ny < -0.02 && Math.abs(nx) < 0.28) {
        red = 224;
        green = 161;
        blue = 92;
      }
      if (Math.abs(ny - 0.08) < 0.025 && Math.abs(nx) < 0.16) {
        red = 143;
        green = 191;
        blue = 163;
      }
      const index = row + 1 + x * 4;
      raw[index] = red;
      raw[index + 1] = green;
      raw[index + 2] = blue;
      raw[index + 3] = 255;
    }
  }
  return raw;
}

function png(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(paint(size))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(root, { recursive: true });
writeFileSync(join(root, "icon-192.png"), png(192));
writeFileSync(join(root, "icon-512.png"), png(512));
writeFileSync(join(root, "apple-touch-icon.png"), png(180));
