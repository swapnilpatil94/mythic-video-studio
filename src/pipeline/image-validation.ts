import {readFile, stat} from 'node:fs/promises';

export type ImageProbe = {
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  hasAlpha: boolean;
  bytes: number;
};

function pngProbe(buffer: Buffer): ImageProbe | undefined {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(signature) || buffer.length < 26) return undefined;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  if (!width || !height) throw new Error('PNG has invalid dimensions');
  if (![0, 2, 3, 4, 6].includes(colorType)) throw new Error(`PNG has unsupported color type ${colorType}`);
  return {format: 'png', width, height, hasAlpha: colorType === 4 || colorType === 6, bytes: buffer.length};
}

function jpegProbe(buffer: Buffer): ImageProbe | undefined {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    const isSof = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isSof && segmentLength >= 7) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (!width || !height) throw new Error('JPEG has invalid dimensions');
      return {format: 'jpeg', width, height, hasAlpha: false, bytes: buffer.length};
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions could not be read');
}

export async function probeImage(path: string): Promise<ImageProbe> {
  const [buffer, info] = await Promise.all([readFile(path), stat(path)]);
  if (info.size < 16) throw new Error('Image file is too small');
  const probe = pngProbe(buffer) ?? jpegProbe(buffer);
  if (!probe) throw new Error('Unsupported image format; expected PNG or JPEG');
  return {...probe, bytes: info.size};
}

export function validateImage(probe: ImageProbe, options: {maxDimension?: number; minDimension?: number} = {}) {
  const max = options.maxDimension ?? 4096;
  const min = options.minDimension ?? 256;
  if (probe.width < min || probe.height < min) throw new Error(`Image is too small: ${probe.width}x${probe.height}; minimum is ${min}px`);
  if (probe.width > max || probe.height > max) throw new Error(`Image is too large: ${probe.width}x${probe.height}; maximum is ${max}px`);
}
