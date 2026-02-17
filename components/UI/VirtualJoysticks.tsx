
import React, { useRef, useState } from 'react';
import { useStore } from '../../store';

const STICK_RADIUS = 60; // Base radius in px
const NUB_RADIUS = 30;   // Nub radius in px
const DEAD_ZONE = 0.1;

const Joystick = ({ side }: { side: 'left' | 'right' }) => {
    const setJoystick = useStore(state => state.setJoystick);
    const touchId = useRef<number | null>(null);
    
    // UI state is managed internally
    const [base, setBase] = useState<{ x: number, y: number } | null>(null);
    const [nub, setNub] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        if (touch && touchId.current === null) {
            touchId.current = touch.identifier;
            setBase({ x: touch.clientX, y: touch.clientY });
            setNub({ x: 0, y: 0 });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (touchId.current !== null) {
            // FIX: Explicitly cast the found touch to the Touch interface to resolve 'unknown' property access errors.
            const touch = Array.from(e.changedTouches).find(
                (t: Touch) => t.identifier === touchId.current
            ) as Touch | undefined;

            if (touch && base) {
                let dx = touch.clientX - base.x;
                let dy = touch.clientY - base.y;
                const distance = Math.hypot(dx, dy);

                if (distance > STICK_RADIUS) {
                    dx = (dx / distance) * STICK_RADIUS;
                    dy = (dy / distance) * STICK_RADIUS;
                }

                setNub({ x: dx, y: dy });

                const normalizedX = dx / STICK_RADIUS;
                const normalizedY = dy / STICK_RADIUS;
                
                setJoystick(side, {
                    x: Math.abs(normalizedX) < DEAD_ZONE ? 0 : normalizedX,
                    y: Math.abs(normalizedY) < DEAD_ZONE ? 0 : normalizedY,
                });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        // FIX: Explicitly cast the found touch to the Touch interface to resolve 'unknown' property access errors.
        const touch = Array.from(e.changedTouches).find(
            (t: Touch) => t.identifier === touchId.current
        ) as Touch | undefined;
        
        if (touch) {
            touchId.current = null;
            setBase(null);
            setNub({ x: 0, y: 0 });
            setJoystick(side, { x: 0, y: 0 });
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '5%',
        width: '40%',
        height: '40%',
        [side]: '5%',
    };

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${base?.x}px`,
        top: `${base?.y}px`,
        width: STICK_RADIUS * 2,
        height: STICK_RADIUS * 2,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        display: base ? 'block' : 'none',
        pointerEvents: 'none',
    };

    const nubStyle: React.CSSProperties = {
        position: 'absolute',
        left: base ? `${base.x + nub.x}px` : '0px',
        top: base ? `${base.y + nub.y}px` : '0px',
        width: NUB_RADIUS * 2,
        height: NUB_RADIUS * 2,
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        display: base ? 'block' : 'none',
        pointerEvents: 'none',
    };

    return (
        <>
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={containerStyle}
            />
            {base && (
                <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
                    <div style={baseStyle} />
                    <div style={nubStyle} />
                </div>
            )}
        </>
    );
};


export const VirtualJoysticks = () => {
    return (
        <div className="absolute inset-0 pointer-events-auto md:hidden z-30">
            <Joystick side="left" />
            <Joystick side="right" />
        </div>
    );
};
