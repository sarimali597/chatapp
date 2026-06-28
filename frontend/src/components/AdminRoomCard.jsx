import { Users, Lock, Shuffle } from 'lucide-react';

const TYPE_LABEL = {
  group: 'Group',
  paired: 'Random pair',
  direct: 'Direct request',
};

const TYPE_ICON = {
  group: Users,
  paired: Shuffle,
  direct: Lock,
};

export default function AdminRoomCard({ room, isSelected, onSelect }) {
  const Icon = TYPE_ICON[room.type] || Lock;

  return (
    <button
      onClick={() => onSelect(room.roomId)}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
        isSelected ? 'bg-royal-blue/20 border border-royal-blue/40' : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ocean-mist-light">
          <Icon className="size-3.5" />
          {TYPE_LABEL[room.type] || room.type}
        </span>
        <span className="text-[11px] text-white/35">{room.participants.length} in room</span>
      </div>
      <p className="mt-1 truncate text-sm text-white/85">
        {room.participants.length > 0 ? room.participants.join(', ') : 'Empty'}
      </p>
    </button>
  );
}
