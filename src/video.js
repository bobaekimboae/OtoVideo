import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } from 'mediabunny';

const FPS = 24;
const SCENE_SECONDS = 3.2;
const TRANSITION_SECONDS = 0.35;

function coverImage(context, image, width, height, scale = 1, drift = 0) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let cropWidth = image.width;
  let cropHeight = image.height;
  if (imageRatio > targetRatio) cropWidth = image.height * targetRatio;
  else cropHeight = image.width / targetRatio;
  cropWidth /= scale;
  cropHeight /= scale;
  const maxX = image.width - cropWidth;
  const sx = Math.max(0, Math.min(maxX, maxX * (0.5 + drift * 0.42)));
  const sy = Math.max(0, (image.height - cropHeight) * 0.5);
  context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, width, height);
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, r);
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let line = '';
  let lineIndex = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      if (lineIndex >= maxLines) return;
    } else line = test;
  }
  if (line && lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight);
}

function drawOverlay(context, spec, options, sceneIndex, progress, style) {
  const w = options.width;
  const h = options.height;
  const scale = w / 720;
  const gradient = context.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(5, 8, 18, .65)');
  gradient.addColorStop(0.25, 'rgba(5, 8, 18, .04)');
  gradient.addColorStop(0.58, 'rgba(5, 8, 18, .04)');
  gradient.addColorStop(1, 'rgba(5, 8, 18, .84)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);

  if (style === 'cinematic') {
    context.fillStyle = 'rgba(5, 8, 18, .24)';
    context.fillRect(0, h * 0.18, w, h * 0.64);
  }

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#ff7a19';
  roundedRect(context, 38 * scale, 40 * scale, 46 * scale, 46 * scale, 14 * scale);
  context.fill();
  context.fillStyle = '#101522';
  context.font = `900 ${27 * scale}px "Segoe UI", Arial, sans-serif`;
  context.fillText('O', 49 * scale, 72 * scale);
  context.fillStyle = 'rgba(255,255,255,.94)';
  context.font = `700 ${19 * scale}px "Segoe UI", Arial, sans-serif`;
  context.fillText('OTOVIDEO', 98 * scale, 68 * scale);

  const title = [spec.make, spec.model, spec.trim].filter(Boolean).join(' ') || '매물 차량';
  context.fillStyle = '#fff';
  context.font = `900 ${Math.round(56 * scale)}px "Segoe UI", Arial, sans-serif`;
  context.shadowColor = 'rgba(0,0,0,.4)';
  context.shadowBlur = 14 * scale;
  wrapText(context, title.toLocaleUpperCase('ko-KR'), 42 * scale, h - 280 * scale, w - 84 * scale, 68 * scale, 2);
  context.shadowBlur = 0;

  const facts = [spec.year, spec.mileage ? `${Number(spec.mileage).toLocaleString()} km` : '', spec.fuel, spec.transmission]
    .filter(Boolean)
    .join('  ·  ');
  context.fillStyle = 'rgba(255,255,255,.78)';
  context.font = `600 ${25 * scale}px "Segoe UI", Arial, sans-serif`;
  wrapText(context, facts || '사진으로 확인하는 차량 상태', 44 * scale, h - 178 * scale, w - 88 * scale, 34 * scale, 1);

  if (spec.askingPrice) {
    context.fillStyle = '#ff8628';
    context.font = `900 ${43 * scale}px "Segoe UI", Arial, sans-serif`;
    context.fillText(`${spec.currency || '₩'} ${spec.askingPrice}`, 44 * scale, h - 104 * scale);
  }
  context.fillStyle = 'rgba(255,255,255,.7)';
  context.font = `700 ${18 * scale}px "Segoe UI", Arial, sans-serif`;
  const location = [spec.location, spec.projectName || 'OtoVideo'].filter(Boolean).join('  ·  ');
  context.fillText(location.slice(0, 48), 44 * scale, h - 50 * scale);

  context.fillStyle = '#ff7a19';
  roundedRect(context, w - 98 * scale, 40 * scale, 58 * scale, 36 * scale, 18 * scale);
  context.fill();
  context.fillStyle = '#101522';
  context.textAlign = 'center';
  context.font = `800 ${17 * scale}px "Segoe UI", Arial, sans-serif`;
  context.fillText(`${sceneIndex + 1} / ${options.images.length}`, w - 69 * scale, 64 * scale);
  context.textAlign = 'left';
}

function paintFrame(context, images, spec, options, time) {
  const sceneTime = time % SCENE_SECONDS;
  const sceneIndex = Math.min(images.length - 1, Math.floor(time / SCENE_SECONDS));
  const progress = sceneTime / SCENE_SECONDS;
  const width = options.width;
  const height = options.height;
  const zoomStrength = options.style === '3d' ? 0.22 : options.style === 'cinematic' ? 0.12 : 0.07;
  const zoom = 1 + zoomStrength * progress;
  const drift = Math.sin(progress * Math.PI * 2) * (options.style === '3d' ? 0.32 : 0.18);
  context.fillStyle = '#070a15';
  context.fillRect(0, 0, width, height);
  coverImage(context, images[sceneIndex], width, height, zoom, drift);

  let fade = 1;
  if (sceneIndex < images.length - 1 && sceneTime > SCENE_SECONDS - TRANSITION_SECONDS) {
    fade = (sceneTime - (SCENE_SECONDS - TRANSITION_SECONDS)) / TRANSITION_SECONDS;
    context.save();
    context.globalAlpha = fade;
    coverImage(context, images[sceneIndex + 1], width, height, 1 + zoomStrength * 0.04, -drift);
    context.restore();
  }
  drawOverlay(context, spec, options, sceneIndex, progress, options.style);

  if (options.style === '3d') {
    context.save();
    context.globalAlpha = 0.7;
    context.strokeStyle = 'rgba(255,255,255,.24)';
    context.lineWidth = Math.max(1, width / 720);
    context.strokeRect(width * 0.035, height * 0.025, width * 0.93, height * 0.95);
    context.restore();
  }
}

function decodeImages(files) {
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} 파일을 이미지로 읽을 수 없습니다. HEIC은 브라우저에서 지원되지 않을 수 있습니다.`));
    };
    image.src = url;
  })));
}

export async function createVideo(files, spec, settings, onProgress) {
  if (!('VideoEncoder' in window)) {
    throw new Error('이 브라우저는 MP4 인코딩을 지원하지 않습니다. 최신 Chrome 또는 Edge에서 다시 시도해 주세요.');
  }
  const decoded = await decodeImages(files);
  const images = decoded.map((entry) => entry.image);
  const width = settings.width;
  const height = settings.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('캔버스를 초기화하지 못했습니다.');

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    quality: new Quality({ bitrate: Math.max(1_600_000, Math.round(width * height * 2.1)) }),
  });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();
  const duration = files.length * SCENE_SECONDS;
  const totalFrames = Math.ceil(duration * FPS);

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const time = frame / FPS;
      paintFrame(context, images, spec, { ...settings, images: files }, time);
      await source.add(time, 1 / FPS, { keyFrame: frame % (FPS * 2) === 0 });
      if (frame % 12 === 0 || frame === totalFrames - 1) {
        onProgress(Math.round(((frame + 1) / totalFrames) * 100));
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength < 1000) throw new Error('영상 파일을 완성하지 못했습니다. 사진을 확인하고 다시 시도해 주세요.');
    return { blob: new Blob([buffer], { type: 'video/mp4' }), duration, width, height };
  } catch (error) {
    try { await source.close(); } catch {}
    try { await output.cancel(); } catch {}
    throw error;
  } finally {
    decoded.forEach((entry) => URL.revokeObjectURL(entry.url));
  }
}

export const VIDEO_FORMATS = [
  { id: 'vertical', label: '세로 9:16', detail: '인스타그램 릴스 · 틱톡 · 쇼츠', width: 720, height: 1280 },
  { id: 'landscape', label: '가로 16:9', detail: '유튜브 · 매물 소개 영상', width: 1280, height: 720 },
  { id: 'classic', label: '가로 4:3', detail: '4:3 사진 · 여백을 줄인 프레임', width: 960, height: 720 },
  { id: 'square', label: '정사각형 1:1', detail: '소셜 피드 · 차량 소개', width: 720, height: 720 },
];

export const MOTION_STYLES = [
  { id: 'clean', label: '깔끔하고 빠르게', detail: '간결한 전환과 정보 중심 구성', description: '빠른 컷과 차분한 정보 배치로 차량을 소개합니다.' },
  { id: 'cinematic', label: '시네마틱', detail: '전문적인 매물 소개 흐름', description: '부드러운 줌과 영화 같은 어두운 톤으로 차량을 강조합니다.' },
  { id: '3d', label: '3D 프리미엄', detail: '깊이감 있는 카메라 움직임', description: '사진을 천천히 확대하고 좌우로 이동해 깊이감을 더합니다.' },
];

export const VIDEO_LANGUAGES = [
  ['ko', '한국어'], ['tr', '튀르키예어'], ['en', '영어'], ['de', '독일어'], ['es', '스페인어'],
  ['fr', '프랑스어'], ['it', '이탈리아어'], ['pt', '포르투갈어'], ['nl', '네덜란드어'],
  ['pl', '폴란드어'], ['id', '인도네시아어'],
];

export function parseListing(source) {
  const text = String(source || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
  const raw = String(source || '');
  const first = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return '';
  };
  const images = new Set();
  for (const match of raw.matchAll(/(?:src|data-src|content)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    try { const url = new URL(match[1], location.href); if (url.protocol === 'https:') images.add(url.href); } catch {}
  }
  const price = first([/(?:asking price|price|fiyat|sat[ıi]ş fiyat[ıi]|€|₺|₩)\s*[:\-]?\s*([€₺₩$£]?\s?[\d.,\s]{4,})/i]);
  const year = first([/(?:year|model year|연식|년식)\s*[:\-]?\s*(19\d{2}|20\d{2})/i, /\b(20\d{2})\s+(?:model|년식)/i]);
  const mileage = first([/(?:mileage|miles|kilometer|kilometres|km|주행거리|주행)\s*[:\-]?\s*([\d.,\s]{3,})\s*(?:km|mi|miles)?/i]);
  const make = first([/(?:make|brand|manufacturer|marka|제조사|브랜드)\s*[:\-]?\s*([\p{L}\d-]+)/iu]);
  const model = first([/(?:model|모델명?)\s*[:\-]?\s*([\p{L}\d][\p{L}\d .-]{0,42}?)(?=\s+(?:trim|year|model year|mileage|kilometer|kilometres|price|asking price|fuel|transmission|location|연식|년식|주행거리|주행|가격|연료|변속기|지역)\s*[:\-]|$)/iu]);
  const fuel = first([/(?:fuel|yakıt|연료)\s*[:\-]?\s*(petrol|diesel|hybrid|electric|gasoline|휘발유|경유|하이브리드|전기)/i]);
  const transmission = first([/(?:transmission|gearbox|변속기)\s*[:\-]?\s*(automatic|manual|자동|수동)/i]);
  return {
    make,
    model,
    year,
    mileage: mileage.replace(/[,.\s]$/g, '').trim(),
    askingPrice: price.replace(/[€₺₩$£,\s]/g, '').trim(),
    fuel,
    transmission,
    text,
    images: Array.from(images).slice(0, 10),
  };
}
