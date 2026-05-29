import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayValue = selectedOption ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`input-field bg-white/[0.03] text-white border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-4 py-3 w-full cursor-pointer flex items-center justify-between transition-colors ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!selectedOption ? 'text-steel-500' : 'text-white'}>
          {displayValue}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-neutral-500" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt, i) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const isSelected = value === optValue;

                return (
                  <div 
                    key={i}
                    className={`px-4 py-3 cursor-pointer text-sm transition-colors ${
                      isSelected ? 'bg-white/[0.05] text-white font-bold' : 'text-neutral-400 hover:bg-white/[0.03] hover:text-white'
                    }`}
                    onClick={() => {
                      onChange({ target: { value: optValue } });
                      setIsOpen(false);
                    }}
                  >
                    {optLabel}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
