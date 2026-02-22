import { AircraftMesh } from './aircraft-mesh.js';
import { SpaceshipMesh } from './spaceship-mesh.js';
import { ArrowMesh } from './arrow-mesh.js';
import { MantaMesh } from './manta-mesh.js';
import { DroneMesh } from './drone-mesh.js';
import { OrbMesh } from './orb-mesh.js';
import { OBJVehicleMesh } from './obj-vehicle-mesh.js';

export const VEHICLE_DEFINITIONS = [
    { id: 'ship5', label: 'Star-Cruiser (Ship 5)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.2 } },
    { id: 'aircraft', label: 'Jet-Fighter', MeshClass: AircraftMesh, hitbox: { radius: 1.1 } },
    { id: 'spaceship', label: 'Raumschiff', MeshClass: SpaceshipMesh, hitbox: { radius: 1.3 } },
    { id: 'arrow', label: 'Pfeil', MeshClass: ArrowMesh, hitbox: { radius: 0.9 } },
    { id: 'manta', label: 'Manta-Gleiter', MeshClass: MantaMesh, hitbox: { radius: 1.4 } },
    { id: 'drone', label: 'Kampfdrohne', MeshClass: DroneMesh, hitbox: { radius: 0.8 } },
    { id: 'orb', label: 'Energie-Orb', MeshClass: OrbMesh, hitbox: { radius: 1.0 } },
    // Alle anderen Schiffe aus dem Pack
    { id: 'ship1', label: 'Interceptor (Ship 1)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.0 } },
    { id: 'ship2', label: 'Heavy Fighter (Ship 2)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.4 } },
    { id: 'ship3', label: 'Scout (Ship 3)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 0.9 } },
    { id: 'ship4', label: 'Bomber (Ship 4)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.6 } },
    { id: 'ship6', label: 'Vanguard (Ship 6)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.2 } },
    { id: 'ship7', label: 'Defender (Ship 7)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.3 } },
    { id: 'ship8', label: 'Striker (Ship 8)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.1 } },
    { id: 'ship9', label: 'Recon (Ship 9)', MeshClass: OBJVehicleMesh, isObj: true, hitbox: { radius: 1.0 } },
];

const VEHICLE_BY_ID = new Map(VEHICLE_DEFINITIONS.map((entry) => [entry.id, entry]));

export function getVehicleIds() {
    return VEHICLE_DEFINITIONS.map((entry) => entry.id);
}

export function isValidVehicleId(vehicleId) {
    return VEHICLE_BY_ID.has(String(vehicleId || '').trim());
}

export function createVehicleMesh(vehicleId, color) {
    const key = String(vehicleId || '').trim();
    const selected = VEHICLE_BY_ID.get(key) || VEHICLE_DEFINITIONS[0];
    if (selected.isObj) {
        return new selected.MeshClass(color, selected.id);
    }
    return new selected.MeshClass(color);
}
