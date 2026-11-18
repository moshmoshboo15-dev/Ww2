import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../shared/i18n';
import { WEAPONS, WEAPON_CATEGORIES, type Era, type WeaponCategory } from '../../shared/weapons';
import type { ChatMessage, GameSettings, HUDTelemetry, KillFeedItem, MatchLaunchConfig } from '../types';
import type { AshfrontEngine } from '../game/gameEngine';

interface GameHUDProps {
  engine: AshfrontEngine | null;
  settings: GameSettings;
  hud: HUDTelemetry;
  killFeed: KillFeedItem[];
  chat: ChatMessage[];
  matchConfig: MatchLaunchConfig | null;
  paused: boolean;
  onResume: () => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  settings,
  hud,
  killFeed,
  chat,
  matchConfig,
  paused,
  onResume,
  onOpenSettings,
  onQuitToMenu,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatText, setChatText] = useState('');
  const [showWeaponRack, setShowWeaponRack] = useState(false);
  const [rackEra, setRackEra] = useState<Era>(matchConfig?.era || 'ww2');
  const [rackCat, setRackCat] = useState<WeaponCategory>('rifle');

  const lang = settings.language;

  // Tab scoreboard + Enter chat shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      } else if (e.code === 'Enter' && !paused) {
        setShowChatInput((v) => !v);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') setShowScoreboard(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [paused]);

  // Draw live tactical minimap
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const r = w / 2;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(18, 22, 26, 0.84)';
    ctx.fillRect(0, 0, w, h);

    // Subtle radar grid
    ctx.strokeStyle = 'rgba(180, 175, 155, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r, r, r * 0.5, 0, Math.PI * 2);
    ctx.moveTo(r, 0);
    ctx.lineTo(r, h);
    ctx.moveTo(0, r);
    ctx.lineTo(w, r);
    ctx.stroke();

    const scale = r / 95;
    const cos = Math.cos(hud.playerYaw);
    const sin = Math.sin(hud.playerYaw);

    for (const b of hud.blips) {
      const dx = b.x - hud.playerX;
      const dz = b.z - hud.playerZ;
      // Rotate relative to player heading
      const rx = (dx * cos - dz * sin) * scale;
      const rz = (dx * sin + dz * cos) * scale;
      const px = r + rx;
      const py = r + rz;

      if (b.kind === 'gas') {
        ctx.fillStyle = 'rgba(163, 180, 42, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'cp') {
        ctx.fillStyle = b.owner === 1 ? '#3b82f6' : b.owner === 2 ? '#ef4444' : '#d4d4d8';
        ctx.fillRect(px - 6, py - 6, 12, 12);
        ctx.fillStyle = '#09090b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(b.label || '', px, py + 3);
      } else if (b.kind === 'vehicle') {
        ctx.fillStyle = b.owner === 1 ? '#60a5fa' : b.owner === 2 ? '#f87171' : '#facc15';
        ctx.fillRect(px - 3, py - 3, 6, 6);
      } else {
        ctx.fillStyle = b.kind === 'ally' ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Center player chevron
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(r, r - 6);
    ctx.lineTo(r + 4.5, r + 5);
    ctx.lineTo(r, r + 2.5);
    ctx.lineTo(r - 4.5, r + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.strokeStyle = 'rgba(212, 184, 118, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [hud]);

  const mins = Math.floor(hud.roundTime / 60);
  const secs = hud.roundTime % 60;
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Damage Vignette */}
      {hud.damageFlash > 0.04 && (
        <div
          style={{
            boxShadow: `inset 0 0 90px rgba(200, 20, 20, ${Math.min(0.85, hud.damageFlash)})`,
          }}
          className="absolute inset-0"
        />
      )}

      {/* Gas Mask Goggle Overlay */}
      {hud.gasMaskOn && (
        <div
          style={{
            background:
              'radial-gradient(circle at 36% 50%, transparent 18%, rgba(10,12,8,0.86) 46%), radial-gradient(circle at 64% 50%, transparent 18%, rgba(10,12,8,0.86) 46%)',
          }}
          className="absolute inset-0 opacity-65"
        />
      )}

      {/* Toxic Gas Atmosphere Tint */}
      {hud.inGas && !hud.gasMaskOn && (
        <div className="absolute inset-0 bg-lime-700/25" />
      )}

      {/* Sniper Scope Overlay */}
      {hud.isScoped && (
        <div
          style={{
            background: 'radial-gradient(circle at center, transparent 28%, rgba(6,8,10,0.97) 30%)',
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-[56vmin] h-[56vmin] rounded-full border-2 border-stone-500/80 relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-stone-950/90" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-stone-950/90" />
            <div className="w-2 h-2 rounded-full bg-red-600/80" />
          </div>
        </div>
      )}

      {/* Center Crosshair + Hit Marker */}
      {!hud.isScoped && !hud.downed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {settings.crosshairStyle === 'dot' && (
              <div style={{ backgroundColor: settings.crosshairColor }} className="w-1.5 h-1.5 rounded-full" />
            )}
            {settings.crosshairStyle === 'circle' && (
              <div style={{ borderColor: settings.crosshairColor }} className="w-5 h-5 rounded-full border-2" />
            )}
            {settings.crosshairStyle === 'chevron' && (
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M5 13 L10 7 L15 13" fill="none" stroke={settings.crosshairColor} strokeWidth="2" />
              </svg>
            )}
            {settings.crosshairStyle === 'cross' && (
              <svg width="24" height="24" viewBox="0 0 24 24">
                <line x1="12" y1="3" x2="12" y2="8" stroke={settings.crosshairColor} strokeWidth="2" />
                <line x1="12" y1="16" x2="12" y2="21" stroke={settings.crosshairColor} strokeWidth="2" />
                <line x1="3" y1="12" x2="8" y2="12" stroke={settings.crosshairColor} strokeWidth="2" />
                <line x1="16" y1="12" x2="21" y2="12" stroke={settings.crosshairColor} strokeWidth="2" />
              </svg>
            )}
            {hud.hitMarker !== 'none' && (
              <svg width="28" height="28" viewBox="0 0 28 28" className="absolute">
                <path
                  d="M6 6 L11 11 M22 6 L17 11 M6 22 L11 17 M22 22 L17 17"
                  stroke={hud.hitMarker === 'headshot' ? '#fbbf24' : '#ffffff'}
                  strokeWidth="2.5"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* TOP-LEFT: Minimap + FPS/Ping */}
      <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
        <canvas ref={minimapRef} width={116} height={116} className="rounded-full shadow-lg" />
        {settings.showFpsPing && (
          <div className="px-2 py-0.5 rounded bg-stone-950/75 border border-stone-700/70 text-[11px] font-mono tabular-nums text-stone-300 flex gap-2">
            <span>{hud.fps} FPS</span>
            {matchConfig?.online && <span>{hud.ping} ms</span>}
          </div>
        )}
      </div>

      {/* TOP-CENTER: Tickets, Timer & Gas Warning */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 px-4 py-1.5 rounded bg-stone-950/80 border border-stone-700/80 shadow">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-sky-400 uppercase">{t(lang, 'allies')}</span>
            <span className="text-base font-black tabular-nums text-white">{hud.tickets1}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-stone-800 text-xs font-mono tabular-nums text-amber-300">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tabular-nums text-white">{hud.tickets2}</span>
            <span className="text-[11px] font-bold text-red-400 uppercase">{t(lang, 'axis')}</span>
          </div>
        </div>

        {hud.gasActive && (
          <div className="px-3 py-1 rounded bg-lime-900/90 border border-lime-400 text-lime-200 text-xs font-bold tracking-wider">
            {hud.gasMaskOn ? t(lang, 'gasMaskOn') : t(lang, 'gasAlert')}
          </div>
        )}

        {matchConfig?.mode === 'training' && (
          <div className="px-3 py-1 rounded bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-semibold">
            {hud.tutorialText}
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Quick Action Buttons + Kill Feed */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex gap-1.5 pointer-events-auto">
          {matchConfig?.mode === 'training' && (
            <button
              onClick={() => setShowWeaponRack((v) => !v)}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
            >
              Weapon Rack
            </button>
          )}
          <button
            onClick={() => setShowScoreboard((v) => !v)}
            className="px-2.5 py-1 rounded bg-stone-900/85 border border-stone-700 text-stone-200 text-xs font-semibold"
          >
            Scores [Tab]
          </button>
          <button
            onClick={() => setShowChatInput((v) => !v)}
            className="px-2.5 py-1 rounded bg-stone-900/85 border border-stone-700 text-stone-200 text-xs font-semibold"
          >
            Chat
          </button>
          <button
            onClick={() => {
              engine?.setPaused(true);
            }}
            className="px-2.5 py-1 rounded bg-stone-900/85 border border-stone-700 text-amber-300 text-xs font-bold"
          >
            II
          </button>
        </div>

        <div className="flex flex-col items-end gap-1">
          {killFeed.slice(-4).map((k) => (
            <div
              key={k.id}
              className="px-2.5 py-0.5 rounded bg-stone-950/75 border border-stone-800 text-[11px] flex items-center gap-1.5"
            >
              <span className={k.killerTeam === 1 ? 'text-sky-400 font-bold' : 'text-red-400 font-bold'}>
                {k.killerName}
              </span>
              <span className="text-stone-400">[{k.weapon}{k.headshot ? ' HS' : ''}]</span>
              <span className={k.victimTeam === 1 ? 'text-sky-400 font-bold' : 'text-red-400 font-bold'}>
                {k.victimName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER-BOTTOM INTERACT PROMPT */}
      {hud.interactPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded bg-stone-950/85 border border-amber-500/70 text-amber-200 text-xs font-bold tracking-wide">
          {hud.interactPrompt === 'exit'
            ? t(lang, 'exitVehicle')
            : hud.interactPrompt === 'revive'
              ? t(lang, 'revivePrompt')
              : `${t(lang, 'enterVehicle')}: ${hud.interactPrompt.replace('vehicle:', '')}`}
        </div>
      )}

      {/* BOTTOM-LEFT: Health & Gas Mask */}
      <div className="absolute bottom-3 left-3 bg-stone-950/80 border border-stone-700/80 rounded px-3 py-2 min-w-[180px]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold tracking-wider text-stone-300">{t(lang, 'health')}</span>
          <span className="font-mono font-black tabular-nums text-white">{hud.hp} / {hud.maxHp}</span>
        </div>
        <div className="w-full h-2 bg-stone-800 rounded overflow-hidden">
          <div
            style={{ width: `${hpPct}%` }}
            className={`h-full ${hpPct > 40 ? 'bg-emerald-500' : 'bg-red-500'}`}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400 gap-2">
          <span>[G] Mask: {hud.gasMaskOn ? 'ON' : 'OFF'}</span>
          <button
            onClick={() => engine?.triggerGadget()}
            className={`pointer-events-auto px-1.5 py-0.5 rounded font-bold ${
              hud.gadgetCooldown > 0 ? 'bg-stone-800 text-stone-500' : 'bg-amber-600/90 text-stone-950'
            }`}
            title={hud.gadgetLabel}
          >
            [4] {hud.gadgetCooldown > 0 ? `${hud.gadgetCooldown}s` : 'GADGET'}
          </button>
          {hud.submerged && <span className="text-sky-400 font-bold">SUBMERGED</span>}
        </div>
      </div>

      {/* BOTTOM-RIGHT: Weapon / Vehicle HUD */}
      <div className="absolute bottom-3 right-3 bg-stone-950/80 border border-stone-700/80 rounded px-3.5 py-2 text-right min-w-[190px]">
        {hud.vehicleName ? (
          <>
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">{hud.vehicleName}</div>
            <div className="text-[11px] text-stone-300">{hud.vehicleSeatLabel}</div>
            <div className="mt-1 flex items-center justify-end gap-3 font-mono text-xs tabular-nums">
              <span className="text-emerald-400">HP {hud.vehicleHp}/{hud.vehicleMaxHp}</span>
              <span className="text-sky-300">{hud.vehicleSpeed} km/h</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">[F] Switch Seat • [E] Exit</div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">{hud.weaponName}</div>
            <div className="text-2xl font-black font-mono tabular-nums text-white leading-tight">
              {hud.isReloading ? 'RELOAD...' : `${hud.ammoMag} / ${hud.ammoReserve}`}
            </div>
            <div className="text-[10px] text-stone-400">[1] Primary • [2] Sidearm • [3] Frag/Mine • [4] Gadget</div>
          </>
        )}
      </div>

      {/* Chat Feed + Input */}
      <div className="absolute bottom-24 left-3 max-w-xs flex flex-col gap-1">
        {chat.slice(-4).map((m) => (
          <div key={m.id} className="px-2 py-0.5 rounded bg-stone-950/75 text-[11px] text-stone-200">
            <span className={m.team === 1 ? 'text-sky-400 font-bold' : 'text-red-400 font-bold'}>{m.sender}: </span>
            <span>{m.text}</span>
          </div>
        ))}
        {showChatInput && (
          <form
            className="pointer-events-auto flex gap-1 mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              engine?.sendChat(chatText);
              setChatText('');
              setShowChatInput(false);
            }}
          >
            <input
              autoFocus
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Team/All chat..."
              className="px-2 py-1 rounded bg-stone-900 border border-amber-500/60 text-xs text-white outline-none"
            />
            <button type="submit" className="px-2 py-1 bg-amber-600 text-stone-950 font-bold text-xs rounded">
              Send
            </button>
          </form>
        )}
      </div>

      {/* Downed / Respawn Overlay */}
      {(hud.downed || hud.hp <= 0) && hud.winner === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <div className="px-6 py-4 rounded bg-stone-950/90 border border-red-600/70 text-center">
            <div className="text-lg font-black tracking-widest text-red-400">
              {hud.downed ? t(lang, 'downedPrompt') : `RESPAWNING IN ${hud.respawnTimer}s`}
            </div>
          </div>
        </div>
      )}

      {/* Training Range Weapon Rack Drawer */}
      {showWeaponRack && matchConfig?.mode === 'training' && (
        <div className="absolute top-14 right-3 w-80 max-h-[70vh] overflow-y-auto pointer-events-auto bg-stone-950/95 border border-amber-500/70 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 uppercase">Training Weapon Rack</span>
            <button onClick={() => setShowWeaponRack(false)} className="text-xs text-stone-400">Close</button>
          </div>
          <div className="flex gap-1 mb-2">
            {(['ww1', 'ww2'] as Era[]).map((e) => (
              <button
                key={e}
                onClick={() => setRackEra(e)}
                className={`flex-1 py-1 text-xs font-bold rounded ${rackEra === e ? 'bg-amber-600 text-stone-950' : 'bg-stone-800 text-stone-300'}`}
              >
                {e.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {WEAPON_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setRackCat(c)}
                className={`px-2 py-0.5 text-[10px] uppercase rounded ${rackCat === c ? 'bg-amber-600 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {WEAPONS.filter((w) => w.era === rackEra && w.category === rackCat).map((w) => (
              <button
                key={w.id}
                onClick={() => engine?.swapTrainingWeapon(w.id)}
                className="text-left px-2.5 py-1.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs text-stone-100 flex justify-between"
              >
                <span>{w.name}</span>
                <span className="text-amber-400 font-mono">{w.damage} DMG</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          <div className="w-[520px] max-w-[92vw] max-h-[75vh] overflow-y-auto bg-stone-950/95 border border-stone-700 rounded p-4">
            <div className="text-sm font-black tracking-widest text-amber-300 mb-3 uppercase">Match Scoreboard</div>
            <div className="grid grid-cols-5 text-[11px] text-stone-400 font-bold pb-1 border-b border-stone-800">
              <span className="col-span-2">Soldier</span>
              <span>Team</span>
              <span>K / D</span>
              <span className="text-right">Score</span>
            </div>
            {hud.scoreboard.map((row) => (
              <div key={row.id} className="grid grid-cols-5 text-xs py-1.5 border-b border-stone-900 tabular-nums">
                <span className="col-span-2 truncate font-semibold text-stone-100">{row.name}</span>
                <span className={row.team === 1 ? 'text-sky-400' : 'text-red-400'}>
                  {row.team === 1 ? 'Allies' : 'Axis'}
                </span>
                <span className="text-stone-300">{row.kills} / {row.deaths}</span>
                <span className="text-right font-bold text-amber-300">{row.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {paused && hud.winner === 0 && (
        <div className="absolute inset-0 z-30 pointer-events-auto flex items-center justify-center bg-black/70">
          <div className="w-80 bg-stone-950 border border-stone-700 rounded-lg p-5 flex flex-col gap-3 text-center">
            <h2 className="text-xl font-black tracking-widest text-amber-400 uppercase">{t(lang, 'pause')}</h2>
            <button onClick={onResume} className="py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm">
              {t(lang, 'resume')}
            </button>
            <button onClick={onOpenSettings} className="py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm">
              {t(lang, 'settings')}
            </button>
            <button onClick={onQuitToMenu} className="py-2.5 rounded bg-red-900/70 hover:bg-red-800 text-red-100 font-semibold text-sm">
              {t(lang, 'quitMenu')}
            </button>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {hud.winner !== 0 && (
        <div className="absolute inset-0 z-30 pointer-events-auto flex items-center justify-center bg-black/75">
          <div className="w-96 bg-stone-950 border border-amber-500/70 rounded-lg p-6 text-center flex flex-col gap-4">
            <div className={`text-3xl font-black tracking-widest ${hud.winner === hud.playerTeam ? 'text-amber-400' : 'text-red-500'}`}>
              {hud.winner === hud.playerTeam ? t(lang, 'victory') : t(lang, 'defeat')}
            </div>
            <div className="text-sm text-stone-300 tabular-nums">
              {t(lang, 'allies')}: {hud.tickets1} — {t(lang, 'axis')}: {hud.tickets2}
            </div>
            <button onClick={onQuitToMenu} className="py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm">
              {t(lang, 'quitMenu')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
