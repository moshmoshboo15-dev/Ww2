export const MAX_PLAYERS_PER_ROOM = 40;
export const TICK_RATE = 20;

export const EVENTS = {
  ROOMS_LIST: 'rooms:list',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_ERROR: 'room:error',
  PLAYER_INPUT: 'player:input',
  PLAYER_SHOOT: 'player:shoot',
  PLAYER_RELOAD: 'player:reload',
  PLAYER_LOADOUT: 'player:loadout',
  PLAYER_REVIVE: 'player:revive',
  PLAYER_GADGET: 'player:gadget',
  VEHICLE_ENTER: 'vehicle:enter',
  VEHICLE_EXIT: 'vehicle:exit',
  VEHICLE_INPUT: 'vehicle:input',
  VEHICLE_FIRE: 'vehicle:fire',
  WORLD_STATE: 'world:state',
  HIT_CONFIRM: 'hit:confirm',
  KILL_FEED: 'kill:feed',
  CHAT_MSG: 'chat:msg',
  GAS_EVENT: 'gas:event',
  PING_REQ: 'ping:req',
  PING_RES: 'ping:res',
};
