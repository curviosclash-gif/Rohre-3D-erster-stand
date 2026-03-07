import { CONFIG } from '../../core/Config.js';

export function addPlayerInventoryItem(player, type) {
    if (!player) return false;
    if (player.inventory.length < CONFIG.POWERUP.MAX_INVENTORY) {
        player.inventory.push(type);
        return true;
    }
    return false;
}

export function cyclePlayerInventoryItem(player) {
    if (!player) return;
    if (player.inventory.length > 0) {
        player.selectedItemIndex = (player.selectedItemIndex + 1) % player.inventory.length;
    } else {
        player.selectedItemIndex = 0;
    }
}

export function usePlayerInventoryItem(player) {
    if (!player) return null;
    if (player.inventory.length > 0 && player.selectedItemIndex < player.inventory.length) {
        const type = player.inventory.splice(player.selectedItemIndex, 1)[0];
        if (player.selectedItemIndex >= player.inventory.length && player.inventory.length > 0) {
            player.selectedItemIndex = 0;
        }
        player.applyPowerup(type);
        return type;
    }
    return null;
}

export function dropPlayerInventoryItem(player) {
    if (!player) return null;
    if (player.inventory.length > 0) {
        return player.inventory.pop();
    }
    return null;
}
