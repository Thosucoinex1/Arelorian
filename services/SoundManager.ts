
class SoundManager {
    private ctx: AudioContext | null = null;
    private osc: OscillatorNode | null = null;
    private gain: GainNode | null = null;

    constructor() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.gain = this.ctx.createGain();
            this.gain.connect(this.ctx.destination);
        } catch (e) {
            console.warn("AudioContext not supported");
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.ctx || !this.gain) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination); // Connect to master out, not shared gain for overlap
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playUI(type: 'HOVER' | 'CLICK' | 'ERROR') {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        switch (type) {
            case 'HOVER': this.playTone(400, 'sine', 0.05, 0.02); break;
            case 'CLICK': this.playTone(600, 'triangle', 0.1, 0.05); break;
            case 'ERROR': this.playTone(150, 'sawtooth', 0.2, 0.1); break;
        }
    }

    public playCombat(type: 'SWING' | 'HIT' | 'MAGIC') {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        switch (type) {
            case 'SWING': this.playTone(100 + Math.random() * 50, 'sine', 0.15, 0.05); break;
            case 'HIT': this.playTone(80, 'square', 0.1, 0.1); break;
            case 'MAGIC': this.playTone(800 + Math.random() * 200, 'sine', 0.5, 0.05); break;
        }
    }
}

export const soundManager = new SoundManager();