import { CONFIG } from '../../core/Config.js';

export function updatePlayerMotion(player, dt, input, steeringLocked = false) {
    const turnSpeed = CONFIG.PLAYER.TURN_SPEED * dt;
    const rollSpeed = CONFIG.PLAYER.ROLL_SPEED * dt;

    let pitchInput = 0;
    let yawInput = 0;
    let rollInput = 0;

    if (input) {
        pitchInput = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
        yawInput = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);
        rollInput = (input.rollLeft ? 1 : 0) - (input.rollRight ? 1 : 0);

        if (player.invertPitchBase) {
            pitchInput *= -1;
        }
        if (player.invertControls) {
            pitchInput *= -1;
            yawInput *= -1;
        }

        if (CONFIG.GAMEPLAY.PLANAR_MODE) {
            pitchInput = 0;
        }

        if (!steeringLocked && input.boost && player.boostCooldown <= 0 && !player.isBoosting) {
            player.isBoosting = true;
            player.boostTimer = CONFIG.PLAYER.BOOST_DURATION;
        }
    }

    if (steeringLocked) {
        pitchInput = 0;
        yawInput = 0;
        rollInput = 0;
    }

    player._tmpEuler.set(
        pitchInput * turnSpeed,
        yawInput * turnSpeed,
        rollInput * rollSpeed,
        'YXZ'
    );
    player._tmpQuat.setFromEuler(player._tmpEuler);
    player.quaternion.multiply(player._tmpQuat);

    if (CONFIG.PLAYER.AUTO_ROLL && rollInput === 0) {
        player._tmpEuler2.setFromQuaternion(player.quaternion, 'YXZ');
        player._tmpEuler2.z *= (1 - CONFIG.PLAYER.AUTO_ROLL_SPEED * dt);

        if (CONFIG.GAMEPLAY.PLANAR_MODE) {
            player._tmpEuler2.x = 0;
        }

        player.quaternion.setFromEuler(player._tmpEuler2);
    } else if (CONFIG.GAMEPLAY.PLANAR_MODE) {
        player._tmpEuler2.setFromQuaternion(player.quaternion, 'YXZ');
        player._tmpEuler2.x = 0;
        player.quaternion.setFromEuler(player._tmpEuler2);
    }

    if (player.isBoosting) {
        player.boostTimer -= dt;
        player.speed = player.baseSpeed * CONFIG.PLAYER.BOOST_MULTIPLIER;
        if (player.boostTimer <= 0) {
            player.isBoosting = false;
            player.boostCooldown = CONFIG.PLAYER.BOOST_COOLDOWN;
            player.speed = player.baseSpeed;
        }
    }
    if (player.boostCooldown > 0) {
        player.boostCooldown -= dt;
    }

    player._tmpVec.set(0, 0, -1).applyQuaternion(player.quaternion);
    player.velocity.copy(player._tmpVec).multiplyScalar(player.speed);

    if (player.boostPortalTimer > 0) {
        const factor = Math.min(1, player.boostPortalTimer / 0.5);
        const strength = (player.boostPortalParams?.forwardImpulse || 40) * factor;
        player.velocity.addScaledVector(player.boostPortalDir, strength);
        player.speed = Math.max(player.speed, (player.boostPortalParams?.bonusSpeed || 50));
    }

    if (player.slingshotTimer > 0) {
        const factor = Math.min(1, player.slingshotTimer / 1.0);
        const fStrength = (player.slingshotParams?.forwardImpulse || 25) * factor;
        const uStrength = (player.slingshotParams?.liftImpulse || 5) * factor;
        player.velocity.addScaledVector(player.slingshotForward, fStrength);
        player.velocity.addScaledVector(player.slingshotUp, uStrength);
    }

    if (CONFIG.GAMEPLAY.PLANAR_MODE) {
        player.velocity.y = 0;
        player.position.y = player.currentPlanarY;
    }

    player.position.x += player.velocity.x * dt;
    if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
        player.position.y += player.velocity.y * dt;
    }
    player.position.z += player.velocity.z * dt;

    player.trail.update(dt, player.position, player._tmpVec);

    if (player.vehicleMesh && typeof player.vehicleMesh.tick === 'function') {
        player.vehicleMesh.tick(dt);
    }

    player._updateModel();
    player.group.updateMatrixWorld(true);
}
