import React, { useRef, useState } from 'react';
import type { GameSettings, HUDButtonPos, HUDLayout, HUDTelemetry } from '../types';
import type { AshfrontEngine } from '../game/gameEngine';

interface TouchControlsProps {
  engine: AshfrontEngine | null;
  settings: GameSettings;
  hud: HUDTelemetry;
  editingLayout: boolean;
  onUpdateLayout: (layout: HUDLayout) => void;
  onFinishEdit: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  settings,
  hud,
  editingLayout,
  onUpdateLayout,
  onFinishEdit,
}) => {
  const isTouch = settings.forceTouchControls || (typeof window !== 'undefined' && 'ontouchstart' in window && window.innerWidth < 1150);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const joyTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });
  const draggingKey = useRef<keyof HUDLayout | null>(null);

  if (!isTouch && !editingLayout) return null;

  const opacity = settings.joystickOpacity;
  const joyRadius = 52 * settings.joystickSize;

  const btnStyle = (pos: HUDButtonPos): React.CSSProperties => ({
    left: `${pos.xPct}%`,
    top: `${pos.yPct}%`,
    transform: `translate(-50%, -50%) scale(${pos.scale})`,
    opacity,
  });

  const handleLayoutDrag = (key: keyof HUDLayout) => (e: React.PointerEvent) => {
    if (!editingLayout) return;
    e.stopPropagation();
    draggingKey.current = key;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLayoutMove = (e: React.PointerEvent) => {
    if (!editingLayout || !draggingKey.current) return;
    const xPct = Math.max(6, Math.min(94, (e.clientX / window.innerWidth) * 100));
    const yPct = Math.max(10, Math.min(92, (e.clientY / window.innerHeight) * 100));
    onUpdateLayout({
      ...settings.hudLayout,
      [draggingKey.current]: { ...settings.hudLayout[draggingKey.current], xPct, yPct },
    });
  };

  const handleLayoutUp = () => {
    draggingKey.current = null;
  };

  // Look swipe zone on right side
  const onLookTouchStart = (e: React.TouchEvent) => {
    if (editingLayout) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX > window.innerWidth * 0.35 && lookTouchId.current === null) {
        lookTouchId.current = t.identifier;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
      }
    }
  };

  const onLookTouchMove = (e: React.TouchEvent) => {
    if (editingLayout || lookTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        engine?.applyLookDelta(dx * 1.4, dy * 1.4);
      }
    }
  };

  const onLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  // Left joystick touch handlers
  const updateJoystickFromTouch = (t: React.Touch, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > joyRadius) {
      dx = (dx / dist) * joyRadius;
      dy = (dy / dist) * joyRadius;
    }
    setJoyOffset({ x: dx, y: dy });
    const nx = dx / joyRadius;
    const ny = dy / joyRadius;
    if (hud.vehicleName) {
      engine?.setTouchVehicle(-ny, -nx, 0);
    } else {
      engine?.setTouchMove(nx, ny);
    }
  };

  const layout = settings.hudLayout;

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none select-none"
      onPointerMove={handleLayoutMove}
      onPointerUp={handleLayoutUp}
    >
      {/* Right half swipe-to-look area */}
      {!editingLayout && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-auto"
          onTouchStart={onLookTouchStart}
          onTouchMove={onLookTouchMove}
          onTouchEnd={onLookTouchEnd}
        />
      )}

      {editingLayout && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto bg-stone-900/95 border border-amber-500/60 px-4 py-2 rounded flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
            Drag buttons to customize HUD layout
          </span>
          <button
            onClick={onFinishEdit}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded"
          >
            Save Layout
          </button>
        </div>
      )}

      {/* Virtual Movement / Vehicle Steering Joystick */}
      <div
        style={{
          ...btnStyle(layout.joystick),
          width: `${joyRadius * 2}px`,
          height: `${joyRadius * 2}px`,
        }}
        onPointerDown={handleLayoutDrag('joystick')}
        onTouchStart={(e) => {
          if (editingLayout) return;
          const t = e.changedTouches[0];
          joyTouchId.current = t.identifier;
          updateJoystickFromTouch(t, e.currentTarget);
        }}
        onTouchMove={(e) => {
          if (editingLayout) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId.current) {
              updateJoystickFromTouch(t, e.currentTarget);
            }
          }
        }}
        onTouchEnd={() => {
          joyTouchId.current = null;
          setJoyOffset({ x: 0, y: 0 });
          engine?.setTouchMove(0, 0);
          engine?.setTouchVehicle(0, 0, 0);
        }}
        className={`absolute pointer-events-auto rounded-full border-2 ${
          editingLayout ? 'border-amber-400 bg-amber-900/30' : 'border-stone-300/45 bg-stone-900/35'
        } flex items-center justify-center`}
      >
        <div
          style={{ transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)` }}
          className="w-11 h-11 rounded-full bg-stone-200/75 border border-stone-900 shadow-lg"
        />
      </div>

      {/* Fire Button */}
      <button
        style={btnStyle(layout.fire)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('fire')(e);
          engine?.setTouchFire(true);
        }}
        onPointerUp={() => !editingLayout && engine?.setTouchFire(false)}
        onPointerCancel={() => !editingLayout && engine?.setTouchFire(false)}
        className="absolute pointer-events-auto w-16 h-16 rounded-full bg-red-700/80 active:bg-red-600 border-2 border-amber-300/70 text-white font-bold text-xs tracking-wider shadow-lg"
      >
        FIRE
      </button>

      {/* ADS / Secondary Fire */}
      <button
        style={btnStyle(layout.ads)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('ads')(e);
          engine?.setTouchAds(true);
        }}
        onPointerUp={() => !editingLayout && engine?.setTouchAds(false)}
        onPointerCancel={() => !editingLayout && engine?.setTouchAds(false)}
        className="absolute pointer-events-auto w-12 h-12 rounded-full bg-stone-800/80 border border-stone-400/60 text-stone-100 font-bold text-[11px]"
      >
        {hud.vehicleName ? 'BOMB' : 'AIM'}
      </button>

      {/* Reload */}
      <button
        style={btnStyle(layout.reload)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('reload')(e);
          engine?.triggerReload();
        }}
        className="absolute pointer-events-auto w-11 h-11 rounded-full bg-stone-800/80 border border-stone-400/50 text-stone-100 font-bold text-[10px]"
      >
        RLD
      </button>

      {/* Jump / Climb / Surface */}
      <button
        style={btnStyle(layout.jump)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('jump')(e);
          if (hud.vehicleDomain === 'air') engine?.setTouchVehicle(1, 0, 1);
          else engine?.triggerJump();
        }}
        onPointerUp={() => !editingLayout && hud.vehicleDomain === 'air' && engine?.setTouchVehicle(0, 0, 0)}
        className="absolute pointer-events-auto w-12 h-12 rounded-full bg-stone-800/80 border border-stone-400/50 text-stone-100 font-bold text-[10px]"
      >
        {hud.vehicleDomain === 'air' ? 'UP' : hud.vehicleCanSubmerge ? 'SURF' : 'JUMP'}
      </button>

      {/* Crouch / Dive */}
      <button
        style={btnStyle(layout.crouch)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('crouch')(e);
          if (hud.vehicleDomain === 'air') engine?.setTouchVehicle(1, 0, -1);
          else engine?.triggerCrouch();
        }}
        onPointerUp={() => !editingLayout && hud.vehicleDomain === 'air' && engine?.setTouchVehicle(0, 0, 0)}
        className="absolute pointer-events-auto w-11 h-11 rounded-full bg-stone-800/80 border border-stone-400/50 text-stone-100 font-bold text-[10px]"
      >
        {hud.vehicleDomain === 'air' ? 'DOWN' : hud.vehicleCanSubmerge ? 'DIVE' : 'CRCH'}
      </button>

      {/* Swap Weapon / Vehicle Seat */}
      <button
        style={btnStyle(layout.swap)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('swap')(e);
          if (hud.vehicleName) engine?.cycleVehicleSeat();
          else engine?.switchSlot();
        }}
        className="absolute pointer-events-auto w-11 h-11 rounded-full bg-stone-800/80 border border-stone-400/50 text-stone-100 font-bold text-[10px]"
      >
        {hud.vehicleName ? 'SEAT' : 'SWAP'}
      </button>

      {/* Grenade / Explosive Slot */}
      <button
        style={btnStyle(layout.grenade)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('grenade')(e);
          engine?.switchSlot(2);
        }}
        className="absolute pointer-events-auto w-11 h-11 rounded-full bg-stone-800/80 border border-stone-400/50 text-amber-200 font-bold text-[10px]"
      >
        FRAG
      </button>

      {/* Gas Mask */}
      <button
        style={btnStyle(layout.gasMask)}
        onPointerDown={(e) => {
          if (editingLayout) return handleLayoutDrag('gasMask')(e);
          engine?.toggleGasMask();
        }}
        className={`absolute pointer-events-auto w-11 h-11 rounded-full border text-[10px] font-bold ${
          hud.gasMaskOn
            ? 'bg-lime-700/85 border-lime-300 text-white'
            : 'bg-stone-800/80 border-stone-400/50 text-stone-200'
        }`}
      >
        MASK
      </button>

      {/* Interact (Enter/Exit Vehicle, Revive) */}
      {(hud.interactPrompt || editingLayout) && (
        <button
          style={btnStyle(layout.interact)}
          onPointerDown={(e) => {
            if (editingLayout) return handleLayoutDrag('interact')(e);
            engine?.handleInteract();
          }}
          className="absolute pointer-events-auto px-3 py-2 rounded-lg bg-amber-600/90 border border-amber-300 text-stone-950 font-bold text-xs shadow-lg"
        >
          {hud.interactPrompt === 'exit' ? 'EXIT' : hud.interactPrompt === 'revive' ? 'REVIVE' : 'ENTER'}
        </button>
      )}
    </div>
  );
};
