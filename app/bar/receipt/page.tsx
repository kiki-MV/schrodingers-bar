'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Receipt } from '@/types';

// 壁纸尺寸 (9:16 手机比例)
const WALL_W = 1080;
const WALL_H = 1920;
// 预览尺寸 (方形)
const PREVIEW_SIZE = 400;

export default function ReceiptPage() {
  const router = useRouter();
  const { token, isLoggedIn, loading: authLoading } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [quantumPhrase, setQuantumPhrase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallpaperReady, setWallpaperReady] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const wallpaperCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const receiptCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth');
  }, [authLoading, isLoggedIn, router]);

  // 获取账单数据
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/receipt', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        setReceipt(data.receipt);
        setQuantumPhrase(data.quantumPhrase);
        if (data.generatedImage) {
          const stamped = await stampWatermark(data.generatedImage);
          setGeneratedImage(stamped);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // 数据就绪后绘制 Canvas + 异步生成 AI 图片
  useEffect(() => {
    if (!receipt) return;
    (async () => {
      await drawWallpaper();
      drawPreview();
      drawReceipt();
    })();
    // 如果没有预生成图，异步生成
    if (!generatedImage) generateAIImage();
  }, [receipt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateAIImage() {
    if (!token || !receipt) return;
    setImageLoading(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Image gen failed:', await res.text());
        return;
      }
      const data = await res.json();
      if (data.image) {
        const stamped = await stampWatermark(data.image);
        setGeneratedImage(stamped);
        setImagePrompt(data.prompt);
        // 同步到吧台墙
        await fetch('/api/bar/visitors/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId: receipt.id,
            image: data.image,
            thumbnail: data.thumbnail,
            prompt: data.prompt,
          }),
        });
      }
    } catch (e) {
      console.error('Image gen error:', e);
    } finally {
      setImageLoading(false);
    }
  }

  // ======== 壁纸 (1080x1920) ========
  async function drawWallpaper() {
    if (!receipt || !wallpaperCanvasRef.current) return;
    const canvas = wallpaperCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = WALL_W;
    canvas.height = WALL_H;

    const lastDrink = receipt.drinks[receipt.drinks.length - 1];
    const mainColor = (lastDrink as any).color || '#a855f7';
    const glowColor = (lastDrink as any).glowColor || '#c084fc';
    const drunk = receipt.totalDrunkLevel;

    // ── 底层：深色渐变背景 ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, WALL_H);
    bgGrad.addColorStop(0, '#05050a');
    bgGrad.addColorStop(0.3, hexToRgba(mainColor, 0.15));
    bgGrad.addColorStop(0.6, '#08080f');
    bgGrad.addColorStop(1, hexToRgba(glowColor, 0.1));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WALL_W, WALL_H);

    // 粒子
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * WALL_W;
      const y = Math.random() * WALL_H;
      const r = Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(
        [mainColor, glowColor, '#ec4899', '#06b6d4'][Math.floor(Math.random() * 4)],
        Math.random() * 0.3,
      );
      ctx.fill();
    }

    // 发光圆环
    const cx = WALL_W / 2, cy = WALL_H * 0.35;
    for (let r = 320; r > 100; r -= 6) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(mainColor, 0.02 + (320 - r) * 0.0008);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 醉度光晕
    const glow = ctx.createRadialGradient(cx, cy, 50, cx, cy, 250 + drunk * 2);
    glow.addColorStop(0, hexToRgba(mainColor, 0.3));
    glow.addColorStop(0.5, hexToRgba(glowColor, 0.1));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WALL_W, WALL_H);

    // ── 中层：头像 ──
    if (receipt.agentAvatar) {
      try {
        const img = await loadImage(receipt.agentAvatar);
        const size = 240;

        // 赛博朋克处理：先画到临时 canvas 做滤镜
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = size;
        tmpCanvas.height = size;
        const tmpCtx = tmpCanvas.getContext('2d')!;

        // 画圆形头像
        tmpCtx.beginPath();
        tmpCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        tmpCtx.clip();
        tmpCtx.drawImage(img, 0, 0, size, size);

        // 色调偏移（赛博朋克感）
        const imgData = tmpCtx.getImageData(0, 0, size, size);
        const pixels = imgData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          // 增加对比度 + 偏紫色调
          pixels[i] = Math.min(255, pixels[i] * 1.1 + 15);     // R 偏高
          pixels[i + 1] = Math.max(0, pixels[i + 1] * 0.85);   // G 压低
          pixels[i + 2] = Math.min(255, pixels[i + 2] * 1.2 + 20); // B 偏高
        }
        tmpCtx.putImageData(imgData, 0, 0);

        // 色差效果（chromatic aberration）
        ctx.globalAlpha = 0.3;
        ctx.drawImage(tmpCanvas, cx - size / 2 - 4, cy - size / 2, size, size); // 红偏移
        ctx.globalAlpha = 0.3;
        ctx.drawImage(tmpCanvas, cx - size / 2 + 4, cy - size / 2, size, size); // 蓝偏移
        ctx.globalAlpha = 1;
        ctx.drawImage(tmpCanvas, cx - size / 2, cy - size / 2, size, size); // 正片

        // 头像霓虹边框
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 30;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } catch (e) {
        // 头像加载失败 → 占位
        console.error('Avatar load failed:', e);
        ctx.beginPath();
        ctx.arc(cx, cy, 120, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(mainColor, 0.3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🍸', cx, cy + 28);
      }
    }

    // ── 顶层：文字 ──
    ctx.textAlign = 'center';

    // 酒杯 emoji
    const emojis = receipt.drinks.map((d) => d.emoji).join(' ');
    ctx.font = '48px sans-serif';
    ctx.fillText(emojis, cx, cy + 170);

    // Agent 名字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;
    ctx.fillText(receipt.agentName, cx, cy + 235);
    ctx.shadowBlur = 0;

    // 酒名
    const drinkNames = receipt.drinks.map((d) => d.name).join(' · ');
    ctx.fillStyle = glowColor;
    ctx.font = '24px monospace';
    ctx.fillText(drinkNames, cx, cy + 280);

    // 醉度条
    const barW = 400, barH = 12;
    const barX = (WALL_W - barW) / 2, barY = cy + 310;
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fill();
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#22c55e');
    barGrad.addColorStop(0.5, '#f59e0b');
    barGrad.addColorStop(0.8, '#ec4899');
    barGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, barW * (drunk / 100), barH, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px monospace';
    ctx.fillText(`醉度 ${drunk}%`, cx, barY + 45);

    // 分隔线
    const sepY = barY + 80;
    ctx.strokeStyle = hexToRgba(mainColor, 0.3);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(100, sepY);
    ctx.lineTo(WALL_W - 100, sepY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 今晚最荒诞的一句话
    ctx.fillStyle = '#ec4899';
    ctx.font = '20px monospace';
    ctx.fillText('「今晚最荒诞的一句话」', cx, sepY + 50);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '26px sans-serif';
    const quoteLines = wrapText(ctx, receipt.mostAbsurdQuote, WALL_W - 160);
    quoteLines.slice(0, 4).forEach((line, i) => {
      ctx.fillText(line, cx, sepY + 90 + i * 38);
    });

    // 宿醉预警
    const warnY = sepY + 90 + Math.min(quoteLines.length, 4) * 38 + 50;
    ctx.fillStyle = '#f59e0b';
    ctx.font = '20px monospace';
    ctx.fillText('⚠️ 明日宿醉预警', cx, warnY);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px sans-serif';
    const warnLines = wrapText(ctx, receipt.hangoverWarning, WALL_W - 160);
    warnLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, cx, warnY + 36 + i * 32);
    });

    // 底部
    ctx.fillStyle = '#64748b';
    ctx.font = '18px monospace';
    ctx.fillText(receipt.quantumNumber, cx, WALL_H - 120);
    ctx.fillText(`${receipt.enteredAt} → ${receipt.leftAt}`, cx, WALL_H - 90);

    // 酒吧名
    ctx.fillStyle = hexToRgba(mainColor, 0.5);
    ctx.font = '16px monospace';
    ctx.fillText('SCHRÖDINGER\'S BAR', cx, WALL_H - 55);

    // 底部霓虹线
    const btmGrad = ctx.createLinearGradient(0, 0, WALL_W, 0);
    btmGrad.addColorStop(0, mainColor);
    btmGrad.addColorStop(0.5, '#ec4899');
    btmGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, WALL_H - 4, WALL_W, 4);

    // 扫描线
    for (let y = 0; y < WALL_H; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, y, WALL_W, 1);
    }

    // 醉度 glitch 效果：随机水平偏移若干行
    if (drunk > 60) {
      const glitchCount = Math.floor(drunk / 10);
      for (let g = 0; g < glitchCount; g++) {
        const gy = Math.floor(Math.random() * WALL_H);
        const gh = 2 + Math.floor(Math.random() * 6);
        const gx = (Math.random() - 0.5) * drunk * 0.4;
        try {
          const strip = ctx.getImageData(0, gy, WALL_W, gh);
          ctx.putImageData(strip, gx, gy);
        } catch { /* ignore */ }
      }
    }

    setWallpaperReady(true);
  }

  // ======== 方形预览 ========
  function drawPreview() {
    if (!wallpaperCanvasRef.current || !previewCanvasRef.current) return;
    const src = wallpaperCanvasRef.current;
    const dst = previewCanvasRef.current;
    dst.width = PREVIEW_SIZE;
    dst.height = PREVIEW_SIZE;
    const dCtx = dst.getContext('2d')!;
    // 从壁纸中间裁切正方形
    const cropY = (WALL_H - WALL_W) / 2;
    dCtx.drawImage(src, 0, Math.max(0, cropY - 200), WALL_W, WALL_W, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  }

  // ======== 文字账单 ========
  function drawReceipt() {
    if (!receipt || !receiptCanvasRef.current) return;
    const canvas = receiptCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = 400;
    let y = 25;
    const lineH = 22;
    const lastDrink = receipt.drinks[receipt.drinks.length - 1];
    const mainColor = (lastDrink as any).color || '#a855f7';

    const estimatedH = 450 + receipt.drinks.length * 55;
    canvas.width = W;
    canvas.height = estimatedH;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, estimatedH);

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, mainColor);
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 3);

    y += 18;
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('薛定谔酒吧 · 今晚账单', W / 2, y); y += lineH;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('观测时刻 · 量子态已塌缩', W / 2, y); y += lineH;

    const drawDivider = () => {
      ctx.strokeStyle = '#2a2a4a';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(W - 20, y);
      ctx.stroke();
      ctx.setLineDash([]);
      y += 10;
    };
    drawDivider();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.fillText(`客人：${receipt.agentName}`, 25, y); y += 18;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`${receipt.enteredAt} → ${receipt.leftAt}   ${receipt.quantumNumber}`, 25, y); y += 18;
    drawDivider();

    for (const drink of receipt.drinks) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.fillText(`${drink.emoji} ${drink.name} ×${drink.count}`, 25, y); y += 16;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      for (const line of wrapText(ctx, drink.effect, W - 50).slice(0, 2)) {
        ctx.fillText(line, 35, y); y += 14;
      }
      y += 4;
    }
    drawDivider();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('⚠️ 明日宿醉预警', 25, y); y += 18;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    for (const line of wrapText(ctx, receipt.hangoverWarning, W - 50).slice(0, 2)) {
      ctx.fillText(line, 35, y); y += 14;
    }
    y += 5;
    drawDivider();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    for (const line of receipt.settlementNote.split('\n')) {
      ctx.fillText(line, 25, y); y += 16;
    }
    y += 8;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('谢谢光临，观测完成，结果已塌缩。', W / 2, y); y += 16;
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, 3);

    const finalH = y + 15;
    const imgData = ctx.getImageData(0, 0, W, finalH);
    canvas.height = finalH;
    ctx.putImageData(imgData, 0, 0);
  }

  // 下载壁纸
  const downloadWallpaper = () => {
    if (!wallpaperCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `薛定谔酒吧_壁纸_${receipt?.quantumNumber || ''}.png`;
    link.href = wallpaperCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  // 下载完整账单（AI 图 or Canvas 预览 + 文字账单拼接）
  const downloadReceipt = async () => {
    const rec = receiptCanvasRef.current;
    if (!rec) return;

    const W = 400;
    let topImage: HTMLImageElement | HTMLCanvasElement | null = null;
    let topH = 0;

    if (generatedImage) {
      // 用 AI 生成的图
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = generatedImage;
        });
        topH = Math.round(W * img.height / img.width);
        topImage = img;
      } catch { /* fallback below */ }
    }

    if (!topImage && previewCanvasRef.current) {
      topImage = previewCanvasRef.current;
      topH = PREVIEW_SIZE;
    }

    const combined = document.createElement('canvas');
    combined.width = W;
    combined.height = (topImage ? topH + 16 : 0) + rec.height;
    const ctx = combined.getContext('2d')!;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, combined.width, combined.height);

    if (topImage) {
      ctx.drawImage(topImage, 0, 0, W, topH);
      ctx.drawImage(rec, 0, topH + 16);
    } else {
      ctx.drawImage(rec, 0, 0);
    }

    const link = document.createElement('a');
    link.download = `薛定谔酒吧_账单_${receipt?.quantumNumber || ''}.png`;
    link.href = combined.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">📜</p>
          <p className="text-text-secondary font-mono">量子态塌缩中...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/bar')} className="px-6 py-3 rounded-lg border border-neon-purple text-neon-purple hover:bg-neon-purple/10 cursor-pointer font-mono">回到吧台</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 fade-in-up">
          <h1 className="text-2xl font-bold neon-glow mb-2">量子账单</h1>
          <p className="text-text-secondary text-sm">{quantumPhrase}</p>
        </div>

        {/* AI 生成的赛博朋克场景图 */}
        {generatedImage ? (
          <div className="mb-4 fade-in-up">
            <img src={generatedImage} alt="量子态快照"
              className="w-full rounded-xl"
              style={{ boxShadow: '0 0 40px rgba(168,85,247,0.3)' }} />
            <div className="glass-card mt-3 p-4 text-center">
              <p className="text-neon-pink text-sm font-bold mb-1">
                「{receipt?.mostAbsurdQuote?.slice(0, 60)}{(receipt?.mostAbsurdQuote?.length || 0) > 60 ? '…' : ''}」
              </p>
              <p className="text-text-dim text-xs">{receipt?.agentName} · {receipt?.quantumNumber}</p>
            </div>
            <div className="text-center mt-2">
              <a href={generatedImage} download={`薛定谔酒吧_${receipt?.quantumNumber || ''}.png`}
                className="text-neon-pink text-xs font-mono hover:underline cursor-pointer">
                📱 下载场景图
              </a>
            </div>
          </div>
        ) : imageLoading ? (
          <div className="glass-card p-12 text-center mb-4 fade-in-up">
            <p className="text-3xl mb-3 animate-pulse">🎨</p>
            <p className="text-text-secondary text-sm font-mono">量子态快照生成中……</p>
            <p className="text-text-dim text-xs mt-1">正在用 AI 绘制你的赛博朋克酒吧肖像</p>
          </div>
        ) : (
          <div className="flex justify-center mb-2 fade-in-up">
            <canvas ref={previewCanvasRef} className="rounded-xl w-full max-w-[400px]" style={{ boxShadow: '0 0 40px rgba(168,85,247,0.25)' }} />
          </div>
        )}

        {/* 文字账单 */}
        <div className="flex justify-center mb-6 fade-in-up">
          <canvas ref={receiptCanvasRef} className="rounded-xl w-full max-w-[400px]" />
        </div>

        {/* 操作 */}
        <div className="space-y-3 fade-in-up">
          <button onClick={downloadReceipt} className="w-full py-4 rounded-lg font-mono text-lg bg-neon-purple/20 border border-neon-purple text-neon-purple hover:bg-neon-purple/30 cursor-pointer">
            📸 下载完整账单图
          </button>
          <div className="flex gap-3">
            <button onClick={() => router.push('/bar')} className="flex-1 py-3 rounded-lg font-mono text-sm border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">🍸 再喝一轮</button>
            <button onClick={() => router.push('/')} className="flex-1 py-3 rounded-lg font-mono text-sm border border-border-dim text-text-dim hover:text-text-secondary cursor-pointer">🚪 离开酒吧</button>
          </div>
        </div>

        {/* 隐藏的壁纸画布 */}
        <canvas ref={wallpaperCanvasRef} className="hidden" />
      </div>
    </div>
  );
}

// ── 工具函数 ──

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 给图片右下角打上酒吧 logo 水印 */
async function stampWatermark(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // 右下角半透明背景
      const text = '🍸 薛定谔酒吧';
      ctx.font = `bold ${Math.max(14, img.width / 30)}px sans-serif`;
      const metrics = ctx.measureText(text);
      const pad = 8;
      const tx = img.width - metrics.width - pad * 3;
      const ty = img.height - pad * 3;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.roundRect(tx - pad, ty - Math.max(14, img.width / 30) - pad / 2, metrics.width + pad * 2, Math.max(14, img.width / 30) + pad * 2, 6);
      ctx.fill();

      ctx.fillStyle = 'rgba(168,85,247,0.9)';
      ctx.fillText(text, tx, ty);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback
    img.src = dataUrl;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Image load failed: ${src}`));
    // 通过代理绕过 CORS
    img.src = `/api/proxy-image?url=${encodeURIComponent(src)}`;
  });
}
