import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-axiom-cyan ${
        checked ? 'bg-axiom-cyan' : 'bg-gray-600'
      }`}>
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};
