import { useState, useEffect } from 'react';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Ouroboros',
    icon: '🌍',
    text: 'Use the virtual joysticks or WASD keys to move your character through the world. Tap and drag to look around.',
  },
  {
    title: 'Skills & Actions',
    icon: '⚔️',
    text: 'Your skill bar is at the bottom of the screen. Tap skills to attack, gather resources, or cast abilities.',
  },
  {
    title: 'The World',
    icon: '🗺️',
    text: 'Explore forests, mountains, and plains. Open the map to see discovered areas. Gather materials from the environment.',
  },
  {
    title: 'Combat',
    icon: '🐉',
    text: 'Fight monsters to earn experience and level up. Defeat enemies to collect loot and grow stronger.',
  },
  {
    title: 'Safe Zone',
    icon: '🏰',
    text: 'The city is your home base. Visit shops, manage your inventory, and prepare for adventures — no monsters spawn here.',
  },
];

const STORAGE_KEY = 'ouroboros_tutorial_complete';

const TutorialOverlay = () => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  if (!visible) return null;

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const dismiss = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto w-[340px] max-w-[90vw]">
      <div className="bg-[#0a0d1a]/95 border border-[var(--arl-border-glow)] rounded-2xl p-5 shadow-[0_0_30px_rgba(31,184,184,0.12)] backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--arl-teal)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {current.title}
            </h3>
          </div>
          <span className="text-[10px] text-[var(--arl-text-muted)] font-mono">
            {step + 1}/{TUTORIAL_STEPS.length}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-[var(--arl-text-secondary)] mb-4">
          {current.text}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 flex-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[var(--arl-teal)]' : 'bg-[var(--arl-border)]'}`}
              />
            ))}
          </div>

          <button
            onClick={skip}
            className="text-[10px] text-[var(--arl-text-muted)] hover:text-[var(--arl-text-secondary)] transition-colors uppercase tracking-wider"
          >
            Skip
          </button>

          <button
            onClick={dismiss}
            className="px-4 py-1.5 bg-[var(--arl-teal)]/20 hover:bg-[var(--arl-teal)]/30 border border-[var(--arl-teal)]/40 text-[var(--arl-teal)] text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
          >
            {isLast ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
