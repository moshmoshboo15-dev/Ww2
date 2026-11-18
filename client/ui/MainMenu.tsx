import React, { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { MAP_LIST, GAME_MODES, TIME_VARIANTS } from '../../shared/maps';
import { WEAPONS, WEAPON_CATEGORIES, WEAPON_SKINS, type Era, type WeaponCategory } from '../../shared/weapons';
import { CHALLENGES, CLASS_LIST, OUTFITS, getLevelFromXp } from '../../shared/classes';
import { t } from '../../shared/i18n';
import { EVENTS } from '../../shared/protocol';
import type { GameSettings, MatchLaunchConfig, PlayerLoadout, ProgressionData } from '../types';
import { DEFAULT_HUD_LAYOUT, DEFAULT_SETTINGS, loadRecentServers, rememberServer } from '../storage';
import { soundEngine } from '../audio/soundEngine';

interface RoomSummary {
  id: string;
  name: string;
  mapId: string;
  mode: string;
  era: string;
  players: number;
  bots: number;
  maxPlayers: number;
}

interface MainMenuProps {
  settings: GameSettings;
  loadout: PlayerLoadout;
  progression: ProgressionData;
  initialTab?: 'home' | 'online' | 'single' | 'loadout' | 'barracks' | 'settings';
  onUpdateSettings: (s: GameSettings) => void;
  onUpdateLoadout: (l: PlayerLoadout) => void;
  onClaimChallenge: (id: string, xp: number) => void;
  onLaunchMatch: (cfg: MatchLaunchConfig) => void;
  onPreviewMap: (mapId: string, timeId: string) => void;
  onEditHudLayout: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  loadout,
  progression,
  initialTab = 'home',
  onUpdateSettings,
  onUpdateLoadout,
  onClaimChallenge,
  onLaunchMatch,
  onPreviewMap,
  onEditHudLayout,
}) => {
  const [tab, setTab] = useState<'home' | 'online' | 'single' | 'loadout' | 'barracks' | 'settings'>(initialTab);
  const [spMap, setSpMap] = useState('ww1_trench');
  const [spMode, setSpMode] = useState<'conquest' | 'tdm' | 'freeroam'>('conquest');
  const [spEra, setSpEra] = useState<Era>('ww1');
  const [spTime, setSpTime] = useState<'noon' | 'dawn' | 'dusk' | 'overcast'>('overcast');
  const [spBots, setSpBots] = useState(10);

  // Loadout editor sub-state
  const [catFilter, setCatFilter] = useState<WeaponCategory>('rifle');
  const [slotTarget, setSlotTarget] = useState<'primary' | 'secondary' | 'explosive'>('primary');

  // Online Connect state
  const defaultAddr = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
    ? window.location.host
    : '192.168.1.10:3000';
  const [serverAddr, setServerAddr] = useState(defaultAddr);
  const [recentServers, setRecentServers] = useState<string[]>(() => loadRecentServers());
  const [connStatus, setConnStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connError, setConnError] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [probeSocket, setProbeSocket] = useState<Socket | null>(null);
  const [hostRoomName, setHostRoomName] = useState('Ashfront WiFi Room');
  const [hostMap, setHostMap] = useState('ww2_armor');
  const [hostMode, setHostMode] = useState<'conquest' | 'tdm' | 'freeroam'>('conquest');
  const [hostBots, setHostBots] = useState(8);

  const [settingsTab, setSettingsTab] = useState<'graphics' | 'controls' | 'audio'>('graphics');

  const lang = settings.language;
  const isRtl = lang === 'ar';
  const lvlInfo = getLevelFromXp(progression.xp);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      probeSocket?.disconnect();
    };
  }, [probeSocket]);

  const connectToServer = (addr: string) => {
    soundEngine.playUIClick();
    probeSocket?.disconnect();
    const clean = addr.trim();
    if (!clean) return;
    setConnStatus('connecting');
    setConnError('');
    const url = clean.startsWith('http') ? clean : `http://${clean}`;
    const s = io(url, { transports: ['websocket', 'polling'], timeout: 5000 });
    setProbeSocket(s);

    s.on('connect', () => {
      setConnStatus('connected');
      setRecentServers(rememberServer(clean));
      s.emit(EVENTS.ROOMS_LIST);
    });
    s.on(EVENTS.ROOMS_LIST, (list: RoomSummary[]) => {
      setRooms(list || []);
    });
    s.on('connect_error', (err) => {
      setConnStatus('error');
      setConnError(err.message || 'Unable to reach server');
    });
    s.on(EVENTS.ROOM_CREATE, (res: { roomId: string }) => {
      s.disconnect();
      onLaunchMatch({
        mode: hostMode,
        mapId: hostMap,
        era: hostMap.startsWith('ww1') ? 'ww1' : 'ww2',
        timeOfDay: 'noon',
        botCount: hostBots,
        online: true,
        serverUrl: clean,
        roomId: res.roomId,
      });
    });
  };

  const joinOnlineRoom = (room: RoomSummary) => {
    soundEngine.playUIClick();
    probeSocket?.disconnect();
    onLaunchMatch({
      mode: (room.mode as 'conquest' | 'tdm' | 'freeroam') || 'conquest',
      mapId: room.mapId,
      era: (room.era as Era) || 'ww2',
      timeOfDay: 'noon',
      botCount: room.bots,
      online: true,
      serverUrl: serverAddr.trim(),
      roomId: room.id,
    });
  };

  const createOnlineRoom = () => {
    if (!probeSocket || connStatus !== 'connected') return;
    soundEngine.playUIClick();
    probeSocket.emit(EVENTS.ROOM_CREATE, {
      name: hostRoomName,
      mapId: hostMap,
      mode: hostMode,
      era: hostMap.startsWith('ww1') ? 'ww1' : 'ww2',
      botCount: hostBots,
      maxPlayers: 40,
    });
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-6 pointer-events-none"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Bespoke inline SVG Ashfront Emblem */}
          <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
            <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="#181512" stroke="#d4a74b" strokeWidth="2" />
            <path d="M20 8 L28 30 H23.5 L22 25 H18 L16.5 30 H12 L20 8 Z M19 21 H21 L20 15 Z" fill="#e5bc55" />
          </svg>
          <div>
            <div className="text-xl md:text-2xl font-black tracking-[0.22em] text-amber-300 leading-none">
              {t(lang, 'title')}
            </div>
            <div className="text-[10px] tracking-[0.18em] text-stone-300 uppercase mt-1">
              {t(lang, 'subtitle')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-stone-950/85 border border-stone-700/80 rounded px-3 py-1.5">
          <div className="text-right">
            <div className="text-xs font-bold text-stone-100">{loadout.playerName}</div>
            <div className="text-[10px] text-amber-400 font-mono tabular-nums">
              LVL {lvlInfo.level} • {lvlInfo.currentXp}/{lvlInfo.nextLevelXp} XP
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onUpdateSettings({ ...settings, language: lang === 'en' ? 'ar' : 'en' });
            }}
            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[11px] font-bold text-amber-200"
          >
            {lang === 'en' ? 'العربية' : 'EN'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-between gap-6 my-3 overflow-hidden">
        {tab === 'home' && (
          <div className="w-72 md:w-80 pointer-events-auto flex flex-col gap-2.5 bg-stone-950/85 border border-stone-700/80 rounded-lg p-4 shadow-2xl">
            <button
              onClick={() => { soundEngine.playUIClick(); setTab('single'); }}
              className="w-full py-3 px-4 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-sm tracking-wider uppercase text-left flex justify-between items-center"
            >
              <span>{t(lang, 'singlePlayer')}</span>
              <span>▶</span>
            </button>
            <button
              onClick={() => { soundEngine.playUIClick(); setTab('online'); }}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-amber-200 font-bold text-sm tracking-wider uppercase text-left"
            >
              {t(lang, 'playOnline')}
            </button>
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onLaunchMatch({
                  mode: 'training',
                  mapId: 'training_range',
                  era: loadout.era,
                  timeOfDay: 'noon',
                  botCount: 3,
                  online: false,
                });
              }}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-bold text-sm tracking-wider uppercase text-left"
            >
              {t(lang, 'trainingRange')}
            </button>
            <button
              onClick={() => { soundEngine.playUIClick(); setTab('loadout'); }}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-bold text-sm tracking-wider uppercase text-left"
            >
              {t(lang, 'loadout')}
            </button>
            <button
              onClick={() => { soundEngine.playUIClick(); setTab('barracks'); }}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-bold text-sm tracking-wider uppercase text-left"
            >
              {t(lang, 'barracks')}
            </button>
            <button
              onClick={() => { soundEngine.playUIClick(); setTab('settings'); }}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-bold text-sm tracking-wider uppercase text-left"
            >
              {t(lang, 'settings')}
            </button>
          </div>
        )}

        {tab === 'single' && (
          <div className="w-full max-w-3xl mx-auto max-h-[76vh] overflow-y-auto pointer-events-auto bg-stone-950/92 border border-stone-700 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-lg font-black text-amber-300 uppercase tracking-wider">{t(lang, 'singlePlayer')}</h2>
              <button onClick={() => setTab('home')} className="px-3 py-1 rounded bg-stone-800 text-xs text-stone-300">Back</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold text-stone-400 uppercase mb-1.5">{t(lang, 'map')}</div>
                <div className="flex flex-col gap-1.5">
                  {MAP_LIST.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSpMap(m.id);
                        setSpEra(m.era);
                        setSpTime(m.defaultTime);
                        onPreviewMap(m.id, m.defaultTime);
                      }}
                      className={`p-2.5 rounded border text-left ${
                        spMap === m.id ? 'bg-amber-900/40 border-amber-500 text-white' : 'bg-stone-900 border-stone-700 text-stone-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{m.name}</div>
                      <div className="text-[10px] text-stone-400">{m.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase mb-1.5">{t(lang, 'mode')}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GAME_MODES.filter((g) => g.id !== 'training').map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setSpMode(g.id as 'conquest' | 'tdm' | 'freeroam')}
                        className={`py-2 px-2 rounded text-xs font-bold ${
                          spMode === g.id ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 border border-stone-700 text-stone-300'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase mb-1.5">{t(lang, 'weather')}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.values(TIME_VARIANTS).map((tv) => (
                      <button
                        key={tv.id}
                        onClick={() => {
                          setSpTime(tv.id);
                          onPreviewMap(spMap, tv.id);
                        }}
                        className={`py-1.5 px-2 rounded text-xs font-semibold ${
                          spTime === tv.id ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 border border-stone-700 text-stone-300'
                        }`}
                      >
                        {tv.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-300 mb-1">
                    <span>{t(lang, 'bots')}</span>
                    <span className="font-mono text-amber-300">{spBots}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={spBots}
                    onChange={(e) => setSpBots(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <button
                  onClick={() =>
                    onLaunchMatch({
                      mode: spMode,
                      mapId: spMap,
                      era: spEra,
                      timeOfDay: spTime,
                      botCount: spBots,
                      online: false,
                    })
                  }
                  className="mt-auto py-3 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider"
                >
                  {t(lang, 'deploy')}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'online' && (
          <div className="w-full max-w-4xl mx-auto max-h-[76vh] overflow-y-auto pointer-events-auto bg-stone-950/92 border border-stone-700 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-lg font-black text-amber-300 uppercase tracking-wider">{t(lang, 'playOnline')}</h2>
              <button onClick={() => setTab('home')} className="px-3 py-1 rounded bg-stone-800 text-xs text-stone-300">Back</button>
            </div>

            {/* Connect Bar + Recent 5 Servers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-900 border border-stone-800 rounded p-3 flex flex-col gap-2">
                <label className="text-xs font-bold text-stone-300 uppercase">{t(lang, 'serverAddress')}</label>
                <div className="flex gap-2">
                  <input
                    value={serverAddr}
                    onChange={(e) => setServerAddr(e.target.value)}
                    placeholder="192.168.1.10:3000"
                    className="flex-1 px-3 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                  />
                  <button
                    onClick={() => connectToServer(serverAddr)}
                    className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    {t(lang, 'connect')}
                  </button>
                </div>
                <div className="text-[11px]">
                  Status:{' '}
                  <span className={connStatus === 'connected' ? 'text-emerald-400 font-bold' : connStatus === 'error' ? 'text-red-400' : 'text-stone-400'}>
                    {connStatus.toUpperCase()} {connError && `(${connError})`}
                  </span>
                </div>
                {recentServers.length > 0 && (
                  <div>
                    <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">{t(lang, 'recentServers')}</div>
                    <div className="flex flex-wrap gap-1">
                      {recentServers.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setServerAddr(s);
                            connectToServer(s);
                          }}
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-mono text-amber-200"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Host Room Panel */}
              <div className="bg-stone-900 border border-stone-800 rounded p-3 flex flex-col gap-2">
                <div className="text-xs font-bold text-stone-300 uppercase">{t(lang, 'hostRoom')}</div>
                <input
                  value={hostRoomName}
                  onChange={(e) => setHostRoomName(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  placeholder="Room Name"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <select
                    value={hostMap}
                    onChange={(e) => setHostMap(e.target.value)}
                    className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-stone-200"
                  >
                    {MAP_LIST.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    value={hostMode}
                    onChange={(e) => setHostMode(e.target.value as 'conquest' | 'tdm' | 'freeroam')}
                    className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-stone-200"
                  >
                    <option value="conquest">Conquest</option>
                    <option value="tdm">Deathmatch</option>
                    <option value="freeroam">Free Roam</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={hostBots}
                    onChange={(e) => setHostBots(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-stone-200"
                    title="Bots"
                  />
                </div>
                <button
                  disabled={connStatus !== 'connected'}
                  onClick={createOnlineRoom}
                  className="py-1.5 rounded bg-emerald-600 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold text-xs"
                >
                  Create & Deploy (Up to 40 Players)
                </button>
              </div>
            </div>

            {/* Active Rooms List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-300 uppercase">Active Server Rooms</span>
                <button
                  onClick={() => probeSocket?.emit(EVENTS.ROOMS_LIST)}
                  className="px-2.5 py-1 rounded bg-stone-800 text-[11px] text-amber-300"
                >
                  {t(lang, 'refreshRooms')}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {rooms.length === 0 ? (
                  <div className="text-xs text-stone-500 py-4 text-center">
                    Connect to a server above (or run `node server/server.js` on your PC/Termux WiFi hotspot).
                  </div>
                ) : (
                  rooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded bg-stone-900 border border-stone-800">
                      <div>
                        <div className="text-xs font-bold text-white">{r.name}</div>
                        <div className="text-[10px] text-stone-400">
                          {r.mapId} • {r.mode.toUpperCase()} • {r.era.toUpperCase()} • Bots: {r.bots}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-amber-300">{r.players}/{r.maxPlayers}</span>
                        <button
                          onClick={() => joinOnlineRoom(r)}
                          className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'loadout' && (
          <div className="w-full max-w-4xl mx-auto max-h-[78vh] overflow-y-auto pointer-events-auto bg-stone-950/92 border border-stone-700 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-amber-300 uppercase">{t(lang, 'loadout')}</h2>
                <input
                  value={loadout.playerName}
                  onChange={(e) => onUpdateLoadout({ ...loadout, playerName: e.target.value.slice(0, 18) })}
                  className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-xs text-white"
                  placeholder="Callsign"
                />
              </div>
              <button onClick={() => setTab('home')} className="px-3 py-1 rounded bg-stone-800 text-xs text-stone-300">Back</button>
            </div>

            {/* Era & Class Selector */}
            <div className="flex flex-wrap gap-2 items-center">
              {(['ww1', 'ww2'] as Era[]).map((e) => (
                <button
                  key={e}
                  onClick={() => onUpdateLoadout({ ...loadout, era: e })}
                  className={`px-3 py-1.5 rounded text-xs font-black uppercase ${
                    loadout.era === e ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 border border-stone-700 text-stone-300'
                  }`}
                >
                  {e.toUpperCase()} Arsenal
                </button>
              ))}
              <div className="h-5 w-[1px] bg-stone-700 mx-1" />
              {CLASS_LIST.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    onUpdateLoadout({
                      ...loadout,
                      classId: c.id,
                      primaryId: c.defaultPrimary[loadout.era],
                      secondaryId: c.defaultSecondary[loadout.era],
                      explosiveId: c.defaultExplosive[loadout.era],
                    })
                  }
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    loadout.classId === c.id ? 'bg-sky-600 text-white' : 'bg-stone-900 border border-stone-700 text-stone-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Slot Target + Weapon Categories */}
            <div className="flex flex-wrap gap-1.5">
              {(['primary', 'secondary', 'explosive'] as const).map((sl) => (
                <button
                  key={sl}
                  onClick={() => setSlotTarget(sl)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                    slotTarget === sl ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-stone-400 border border-stone-700'
                  }`}
                >
                  Slot: {sl}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {WEAPON_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-2.5 py-1 rounded text-[11px] uppercase font-bold ${
                    catFilter === c ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 border border-stone-700 text-stone-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Weapon Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WEAPONS.filter((w) => w.era === loadout.era && w.category === catFilter).map((w) => {
                const selected =
                  (slotTarget === 'primary' && loadout.primaryId === w.id) ||
                  (slotTarget === 'secondary' && loadout.secondaryId === w.id) ||
                  (slotTarget === 'explosive' && loadout.explosiveId === w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      const next = { ...loadout };
                      if (slotTarget === 'primary') next.primaryId = w.id;
                      else if (slotTarget === 'secondary') next.secondaryId = w.id;
                      else next.explosiveId = w.id;
                      onUpdateLoadout(next);
                      soundEngine.playUIClick();
                    }}
                    className={`p-2.5 rounded border text-left flex justify-between items-center ${
                      selected ? 'bg-amber-900/45 border-amber-400 text-white' : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{w.name}</div>
                      <div className="text-[10px] text-stone-400">
                        DMG {w.damage}{w.pellets > 1 ? `x${w.pellets}` : ''} • RPM {w.fireRate} • MAG {w.magSize}
                      </div>
                    </div>
                    {selected && <span className="text-[10px] font-bold text-amber-300">EQUIPPED</span>}
                  </button>
                );
              })}
            </div>

            {/* 6 Weapon Skins & 6 Soldier Outfits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-800">
              <div>
                <div className="text-xs font-bold text-stone-400 uppercase mb-1.5">Weapon Skins (6)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {WEAPON_SKINS.map((sk) => {
                    const locked = lvlInfo.level < sk.unlockLevel;
                    return (
                      <button
                        key={sk.id}
                        disabled={locked}
                        onClick={() => onUpdateLoadout({ ...loadout, skinId: sk.id })}
                        className={`p-1.5 rounded border text-[10px] font-bold ${
                          loadout.skinId === sk.id
                            ? 'border-amber-400 bg-amber-900/40 text-white'
                            : locked
                              ? 'border-stone-800 bg-stone-950 text-stone-600'
                              : 'border-stone-700 bg-stone-900 text-stone-300'
                        }`}
                      >
                        <div className="w-full h-2 rounded mb-1" style={{ backgroundColor: sk.metalColor }} />
                        {sk.name} {locked ? `(Lv${sk.unlockLevel})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-stone-400 uppercase mb-1.5">Soldier Outfits (6)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {OUTFITS.map((of) => {
                    const locked = lvlInfo.level < of.unlockLevel;
                    return (
                      <button
                        key={of.id}
                        disabled={locked}
                        onClick={() => onUpdateLoadout({ ...loadout, outfitId: of.id })}
                        className={`p-1.5 rounded border text-[10px] font-bold ${
                          loadout.outfitId === of.id
                            ? 'border-amber-400 bg-amber-900/40 text-white'
                            : locked
                              ? 'border-stone-800 bg-stone-950 text-stone-600'
                              : 'border-stone-700 bg-stone-900 text-stone-300'
                        }`}
                      >
                        <div className="w-full h-2 rounded mb-1" style={{ backgroundColor: of.alliesColor }} />
                        {of.name} {locked ? `(Lv${of.unlockLevel})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'barracks' && (
          <div className="w-full max-w-2xl mx-auto max-h-[76vh] overflow-y-auto pointer-events-auto bg-stone-950/92 border border-stone-700 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-lg font-black text-amber-300 uppercase">{t(lang, 'barracks')}</h2>
              <button onClick={() => setTab('home')} className="px-3 py-1 rounded bg-stone-800 text-xs text-stone-300">Back</button>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded p-3">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-amber-300">Rank Level {lvlInfo.level}</span>
                <span className="font-mono text-stone-300">{lvlInfo.currentXp} / {lvlInfo.nextLevelXp} XP</span>
              </div>
              <div className="w-full h-2.5 bg-stone-950 rounded overflow-hidden">
                <div
                  style={{ width: `${(lvlInfo.currentXp / lvlInfo.nextLevelXp) * 100}%` }}
                  className="h-full bg-amber-500"
                />
              </div>
              <div className="grid grid-cols-5 gap-2 mt-3 text-center text-[11px]">
                <div className="bg-stone-950 p-1.5 rounded"><div className="text-stone-400">Kills</div><div className="font-bold text-white">{progression.stats.kills}</div></div>
                <div className="bg-stone-950 p-1.5 rounded"><div className="text-stone-400">Headshots</div><div className="font-bold text-white">{progression.stats.headshots}</div></div>
                <div className="bg-stone-950 p-1.5 rounded"><div className="text-stone-400">Captures</div><div className="font-bold text-white">{progression.stats.captures}</div></div>
                <div className="bg-stone-950 p-1.5 rounded"><div className="text-stone-400">Vehicles</div><div className="font-bold text-white">{progression.stats.vehiclesDestroyed}</div></div>
                <div className="bg-stone-950 p-1.5 rounded"><div className="text-stone-400">Revives</div><div className="font-bold text-white">{progression.stats.revives}</div></div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {CHALLENGES.map((ch) => {
                const prog = progression.stats[ch.stat] || 0;
                const done = prog >= ch.target;
                const claimed = progression.claimedChallenges.includes(ch.id);
                return (
                  <div key={ch.id} className="flex items-center justify-between p-3 rounded bg-stone-900 border border-stone-800">
                    <div>
                      <div className="text-xs font-bold text-white">{ch.name}</div>
                      <div className="text-[10px] text-stone-400">{ch.desc} ({Math.min(prog, ch.target)}/{ch.target})</div>
                    </div>
                    <button
                      disabled={!done || claimed}
                      onClick={() => onClaimChallenge(ch.id, ch.rewardXp)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        claimed ? 'bg-stone-800 text-stone-500' : done ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-amber-300'
                      }`}
                    >
                      {claimed ? 'Claimed' : `+${ch.rewardXp} XP`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="w-full max-w-3xl mx-auto max-h-[78vh] overflow-y-auto pointer-events-auto bg-stone-950/94 border border-stone-700 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-lg font-black text-amber-300 uppercase">{t(lang, 'settings')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateSettings({ ...DEFAULT_SETTINGS, hudLayout: DEFAULT_HUD_LAYOUT })}
                  className="px-3 py-1 rounded bg-red-900/60 text-xs text-red-200"
                >
                  {t(lang, 'resetDefaults')}
                </button>
                <button onClick={() => setTab('home')} className="px-3 py-1 rounded bg-amber-600 text-stone-950 font-bold text-xs">
                  {t(lang, 'saveClose')}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {(['graphics', 'controls', 'audio'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSettingsTab(st)}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase ${
                    settingsTab === st ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 text-stone-300 border border-stone-700'
                  }`}
                >
                  {t(lang, st)}
                </button>
              ))}
            </div>

            {settingsTab === 'graphics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Graphics Preset</span>
                  <select
                    value={settings.graphicsPreset}
                    onChange={(e) => onUpdateSettings({ ...settings, graphicsPreset: e.target.value as GameSettings['graphicsPreset'] })}
                    className="p-2 rounded bg-stone-900 border border-stone-700 text-white"
                  >
                    <option value="low">Low (Max Battery)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Bloom + Soft Shadows)</option>
                    <option value="auto">Auto (Adaptive 60 FPS)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">FPS Cap</span>
                  <select
                    value={settings.fpsCap}
                    onChange={(e) => onUpdateSettings({ ...settings, fpsCap: Number(e.target.value) as GameSettings['fpsCap'] })}
                    className="p-2 rounded bg-stone-900 border border-stone-700 text-white"
                  >
                    {[30, 45, 60, 90, 120].map((f) => <option key={f} value={f}>{f} FPS</option>)}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Resolution Scale: {settings.resolutionScale}%</span>
                  <input type="range" min={50} max={100} value={settings.resolutionScale} onChange={(e) => onUpdateSettings({ ...settings, resolutionScale: Number(e.target.value) })} className="accent-amber-500" />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Draw Distance: {settings.drawDistance}m</span>
                  <input type="range" min={120} max={420} value={settings.drawDistance} onChange={(e) => onUpdateSettings({ ...settings, drawDistance: Number(e.target.value) })} className="accent-amber-500" />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Field of View: {settings.fov}°</span>
                  <input type="range" min={60} max={105} value={settings.fov} onChange={(e) => onUpdateSettings({ ...settings, fov: Number(e.target.value) })} className="accent-amber-500" />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Crosshair Style</span>
                  <select
                    value={settings.crosshairStyle}
                    onChange={(e) => onUpdateSettings({ ...settings, crosshairStyle: e.target.value as GameSettings['crosshairStyle'] })}
                    className="p-2 rounded bg-stone-900 border border-stone-700 text-white"
                  >
                    <option value="cross">Cross</option>
                    <option value="dot">Dot</option>
                    <option value="chevron">Chevron</option>
                    <option value="circle">Circle</option>
                  </select>
                </label>

                <label className="flex items-center gap-2"><input type="checkbox" checked={settings.shadows} onChange={(e) => onUpdateSettings({ ...settings, shadows: e.target.checked })} /> Dynamic Soft Shadows</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settings.antiAliasing} onChange={(e) => onUpdateSettings({ ...settings, antiAliasing: e.target.checked })} /> Anti-Aliasing</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settings.showFpsPing} onChange={(e) => onUpdateSettings({ ...settings, showFpsPing: e.target.checked })} /> Show FPS & Ping Counter</label>
              </div>
            )}

            {settingsTab === 'controls' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Hip Sensitivity: {settings.sensHip.toFixed(2)}</span>
                  <input type="range" min={0.2} max={2.5} step={0.05} value={settings.sensHip} onChange={(e) => onUpdateSettings({ ...settings, sensHip: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">ADS Sensitivity: {settings.sensAds.toFixed(2)}</span>
                  <input type="range" min={0.2} max={2.0} step={0.05} value={settings.sensAds} onChange={(e) => onUpdateSettings({ ...settings, sensAds: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Scope Sensitivity: {settings.sensScope.toFixed(2)}</span>
                  <input type="range" min={0.1} max={1.5} step={0.05} value={settings.sensScope} onChange={(e) => onUpdateSettings({ ...settings, sensScope: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Vehicle / Aircraft Sens: {settings.sensVehicle.toFixed(2)}</span>
                  <input type="range" min={0.2} max={2.5} step={0.05} value={settings.sensVehicle} onChange={(e) => onUpdateSettings({ ...settings, sensVehicle: Number(e.target.value), sensAircraft: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Aim Assist: {Math.round(settings.aimAssist * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={settings.aimAssist} onChange={(e) => onUpdateSettings({ ...settings, aimAssist: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Joystick Size: {settings.joystickSize.toFixed(2)}</span>
                  <input type="range" min={0.7} max={1.5} step={0.05} value={settings.joystickSize} onChange={(e) => onUpdateSettings({ ...settings, joystickSize: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Touch HUD Opacity: {Math.round(settings.joystickOpacity * 100)}%</span>
                  <input type="range" min={0.25} max={1} step={0.05} value={settings.joystickOpacity} onChange={(e) => onUpdateSettings({ ...settings, joystickOpacity: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={settings.invertY} onChange={(e) => onUpdateSettings({ ...settings, invertY: e.target.checked })} /> Invert Y-Axis</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={settings.haptics} onChange={(e) => onUpdateSettings({ ...settings, haptics: e.target.checked })} /> Haptic Vibration</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={settings.forceTouchControls} onChange={(e) => onUpdateSettings({ ...settings, forceTouchControls: e.target.checked })} /> Show Touch Controls (Desktop Test)</label>
                </div>
                <button
                  onClick={onEditHudLayout}
                  className="md:col-span-2 py-2 rounded bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-bold"
                >
                  {t(lang, 'hudLayout')}
                </button>
              </div>
            )}

            {settingsTab === 'audio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Master Volume: {Math.round(settings.masterVol * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={settings.masterVol} onChange={(e) => onUpdateSettings({ ...settings, masterVol: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">SFX Volume: {Math.round(settings.sfxVol * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={settings.sfxVol} onChange={(e) => onUpdateSettings({ ...settings, sfxVol: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Music Volume: {Math.round(settings.musicVol * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={settings.musicVol} onChange={(e) => onUpdateSettings({ ...settings, musicVol: Number(e.target.value) })} className="accent-amber-500" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-stone-400 font-bold">Radio / Siren Volume: {Math.round(settings.voiceVol * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={settings.voiceVol} onChange={(e) => onUpdateSettings({ ...settings, voiceVol: Number(e.target.value) })} className="accent-amber-500" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Hint */}
      <div className="text-[11px] text-stone-300/85 bg-stone-950/75 px-3 py-1 rounded self-center border border-stone-800/80">
        WASD Move · Mouse Aim/Fire · R Reload · G Gas Mask · E Vehicle/Revive · F Switch Seat · Esc Pause
      </div>
    </div>
  );
};
