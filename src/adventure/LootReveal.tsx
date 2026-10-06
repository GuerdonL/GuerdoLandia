// The reward ceremony after a quest: where the loot was found, what it is,
// and the real-life reward it stands for.

import { useStore } from '../store';
import { RARITY_COLOR, deliveryText } from './loot';
import type { LootDelivery } from './types';

const CONTAINER: Record<LootDelivery, string> = {
  'monster-drop': '💥',
  'cave-chest': '🧰',
  'treasure-room': '🏛️',
  'dragon-hoard': '🐉',
  'shrine-blessing': '⛩️',
  merchant: '🧙',
  'grateful-villager': '🧑‍🌾',
};

export function LootReveal() {
  const item = useStore((s) => s.lootReveal);
  const dismiss = useStore((s) => s.dismissLoot);
  if (!item) return null;
  const color = RARITY_COLOR[item.rarity];
  return (
    <div className="modal-backdrop" onClick={dismiss}>
      <div className="modal card loot" role="dialog" aria-label="Quest reward" onClick={(e) => e.stopPropagation()} style={{ ['--rarity' as string]: color }}>
        <div className="loot-stage" aria-hidden>
          <span className="loot-container">{CONTAINER[item.delivery]}</span>
          <span className="loot-item">{item.icon}</span>
          <span className="loot-glow" />
        </div>
        <p className="loot-where">Quest complete! {capital(deliveryText(item.delivery))}:</p>
        <h2 className="loot-name">
          {item.icon} {item.name}
        </h2>
        <span className="pill rarity">{item.rarity}</span>
        {item.amount ? <p className="loot-amount">+{item.amount} gold</p> : null}
        <p>{item.description}</p>
        {item.realWorld && (
          <p className="loot-real">
            In real life you earned: <strong>{item.realWorld}</strong>
          </p>
        )}
        {item.effect && <p className="hint">Use it from your bag to give your needs a boost.</p>}
        <button className="btn primary big" onClick={dismiss}>
          Add to bag
        </button>
      </div>
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
