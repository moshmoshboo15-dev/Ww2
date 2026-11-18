import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AshfrontEngine } from './game/gameEngine';
import {
  loadLoadout,
  loadProgression,
  loadSettings,
  saveLoadout,
  saveProgression,
  saveSettings,
} from './storage';
import type {
  ChatMessage,
  GameSettings,
  HUDLayout,
  HUDTelemetry,
  KillFeedItem,
  MatchLaunchConfig,
  PlayerLoadout,
  ProgressionData,
} from './types';
import { MainMenu } from './ui/MainMenu';
import { GameHUD } from './ui/GameHUD';
import { TouchControls } from './ui/TouchControls';

const INITIAL_HUD: HUDTelemetry = {
  hp: 100,
  maxHp: 100,
  ammoMag: 30,
  ammoReserve: 150,
  weaponName: 'Rifle',
  weaponCategory: 'rifle',
  isReloading: false,
  isAds: false,
  isScoped: false,
  gasActive: false,
  inGas: false,
  gasMaskOn: false,
  downed: false,
  respawnTimer: 0,
  tickets1: 300,
  tickets2: 300,
  roundTime: 900,
  winner: 0,
  playerTeam: 1,
  vehicleName: null,
  vehicleHp: 0,
  vehicleMaxHp: 0,
  vehicleDomain: null,
  vehicleSpeed: 0,
  vehicleSeatLabel: null,
  vehicleCanSubmerge: false,
  submerged: false,
  interactPrompt: null,
  reviveTargetId: null,
  hitMarker: 'none',
  damageFlash: 0,
  fps: 60,
  ping: 0,
  mapSize: 260,
  playerX: 0,
  playerZ: 0,
  playerYaw: 0,
  blips: [],
  scoreboard: [],
  tutorialStep: 0,
  tutorialText: '',
  gadgetCooldown: 0,
  gadgetLabel: 'Adrenaline Surge (+Speed/Heal)',
};

export function AshfrontApp() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AshfrontEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [loadout, setLoadout] = useState<PlayerLoadout>(() => loadLoadout());
  const [progression, setProgression] = useState<ProgressionData>(() => loadProgression());

  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [menuTab, setMenuTab] = useState<'home' | 'online' | 'single' | 'loadout' | 'barracks' | 'settings'>('home');
  const [paused, setPaused] = useState(false);
  const [editingHud, setEditingHud] = useState(false);
  const [matchConfig, setMatchConfig] = useState<MatchLaunchConfig | null>(null);

  const [hud, setHud] = useState<HUDTelemetry>(INITIAL_HUD);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const handleProgressionEvent = useCallback((ev: 'kill' | 'headshot' | 'capture' | 'vehicle' | 'revive') => {
    setProgression((prev) => {
      const next: ProgressionData = {
        ...prev,
        xp: prev.xp + (ev === 'vehicle' ? 120 : ev === 'capture' ? 80 : ev === 'revive' ? 75 : ev === 'headshot' ? 60 : 40),
        stats: {
          ...prev.stats,
          kills: prev.stats.kills + (ev === 'kill' ? 1 : 0),
          headshots: prev.stats.headshots + (ev === 'headshot' ? 1 : 0),
          captures: prev.stats.captures + (ev === 'capture' ? 1 : 0),
          vehiclesDestroyed: prev.stats.vehiclesDestroyed + (ev === 'vehicle' ? 1 : 0),
          revives: prev.stats.revives + (ev === 'revive' ? 1 : 0),
        },
      };
      saveProgression(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!canvasMountRef.current) return;
    const engine = new AshfrontEngine(canvasMountRef.current, settings, loadout, {
      onHudUpdate: (h) => setHud(h),
      onKillFeed: (k) => setKillFeed((prev) => [...prev.slice(-8), k]),
      onChat: (m) => setChat((prev) => [...prev.slice(-12), m]),
      onProgressionEvent: handleProgressionEvent,
      onPauseRequest: () => setPaused((p) => !p),
    });
    engineRef.current = engine;
    engine.startMenuShowcase('ww1_trench', 'overcast');

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Mount once so React state changes never tear down WebGL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = (s: GameSettings) => {
    setSettings(s);
    saveSettings(s);
    engineRef.current?.updateSettings(s);
  };

  const updateLoadout = (l: PlayerLoadout) => {
    setLoadout(l);
    saveLoadout(l);
    engineRef.current?.updateLoadout(l);
  };

  const claimChallenge = (id: string, xp: number) => {
    setProgression((prev) => {
      if (prev.claimedChallenges.includes(id)) return prev;
      const next = {
        ...prev,
        xp: prev.xp + xp,
        claimedChallenges: [...prev.claimedChallenges, id],
      };
      saveProgression(next);
      return next;
    });
  };

  const launchMatch = (cfg: MatchLaunchConfig) => {
    setKillFeed([]);
    setChat([]);
    setMatchConfig(cfg);
    setPaused(false);
    setScreen('playing');
    engineRef.current?.launchMatch(cfg);
  };

  const quitToMenu = () => {
    setScreen('menu');
    setMenuTab('home');
    setPaused(false);
    engineRef.current?.startMenuShowcase(matchConfig?.mapId || 'ww1_trench', matchConfig?.timeOfDay || 'overcast');
  };

  const handleUpdateHudLayout = (hudLayout: HUDLayout) => {
    updateSettings({ ...settings, hudLayout });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0d10]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {screen === 'menu' && !editingHud && (
        <MainMenu
          settings={settings}
          loadout={loadout}
          progression={progression}
          initialTab={menuTab}
          onUpdateSettings={updateSettings}
          onUpdateLoadout={updateLoadout}
          onClaimChallenge={claimChallenge}
          onLaunchMatch={launchMatch}
          onPreviewMap={(mapId, timeId) => engineRef.current?.startMenuShowcase(mapId, timeId)}
          onEditHudLayout={() => setEditingHud(true)}
        />
      )}

      {screen === 'playing' && !editingHud && (
        <GameHUD
          engine={engineRef.current}
          settings={settings}
          hud={hud}
          killFeed={killFeed}
          chat={chat}
          matchConfig={matchConfig}
          paused={paused}
          onResume={() => {
            setPaused(false);
            engineRef.current?.setPaused(false);
          }}
          onOpenSettings={() => {
            setScreen('menu');
            setMenuTab('settings');
          }}
          onQuitToMenu={quitToMenu}
        />
      )}

      {(screen === 'playing' || editingHud) && (
        <TouchControls
          engine={engineRef.current}
          settings={settings}
          hud={hud}
          editingLayout={editingHud}
          onUpdateLayout={handleUpdateHudLayout}
          onFinishEdit={() => setEditingHud(false)}
        />
      )}
    </div>
  );
}
