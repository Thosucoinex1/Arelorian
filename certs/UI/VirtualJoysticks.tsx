
import React, { useRef, useState } from 'react';
import { useStore } from '../../store';

const DEAD_ZONE = 0.1;

const Joystick = ({ side }: { side: 'left' | 'right' }) => {
    const setJoystick = useStore(state => state.setJoystick);
    const { isTablet } = useStore(state => state.device);
    const touchId = useRef<number | null>(null);
    
    // Dynamic sizing based on device type
    const stickRadius = isTablet ? 80 : 60;
    const nubRadius = isTablet ? 40 : 30;

    // UI state is managed internally
    const [base, setBase] = useState<{ x: number, y: number } | null>(null);
    const [nub, setNub] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const handleTouchStart = (e: React.TouchEvent) => {
        // Stop propagation to prevent camera controls from stealing touch
        e.stopPropagation();
        const touch = e.changedTouches[0];
        if (touch && touchId.current === null) {
            touchId.current = touch.identifier;
            setBase({ x: touch.clientX, y: touch.clientY });
            setNub({ x: 0, y: 0 });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (touchId.current !== null) {
            let touch: React.Touch | undefined;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId.current) {
                    touch = e.changedTouches[i];
                    break;
                }
            }

            if (touch && base) {
                let dx = touch.clientX - base.x;
                let dy = touch.clientY - base.y;
                const distance = Math.hypot(dx, dy);

                if (distance > stickRadius) {
                    dx = (dx / distance) * stickRadius;
                    dy = (dy / distance) * stickRadius;
                }

                setNub({ x: dx, y: dy });

                const normalizedX = dx / stickRadius;
                const normalizedY = dy / stickRadius;
                
                setJoystick(side, {
                    x: Math.abs(normalizedX) < DEAD_ZONE ? 0 : normalizedX,
                    y: Math.abs(normalizedY) < DEAD_ZONE ? 0 : normalizedY,
                });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        let touch: React.Touch | undefined;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                touch = e.changedTouches[i];
                break;
            }
        }
        
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
        zIndex: 50,
    };

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: base ? `${base.x}px` : '0px',
        top: base ? `${base.y}px` : '0px',
        width: stickRadius * 2,
        height: stickRadius * 2,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(4px)',
        display: base ? 'block' : 'none',
        pointerEvents: 'none',
    };

    const nubStyle: React.CSSProperties = {
        position: 'absolute',
        left: base ? `${base.x + nub.x}px` : '0px',
        top: base ? `${base.y + nub.y}px` : '0px',
        width: nubRadius * 2,
        height: nubRadius * 2,
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        display: base ? 'block' : 'none',
        pointerEvents: 'none',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
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
    const { isMobile, isTablet } = useStore(state => state.device);
    
    if (!isMobile && !isTablet) return null;

    return (
        <div className="absolute inset-0 pointer-events-auto z-30">
            <Joystick side="left" />
            <Joystick side="right" />
        </div>
    );
};
