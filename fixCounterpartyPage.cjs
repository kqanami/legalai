const fs = require('fs');
let c = fs.readFileSync('src/pages/CounterpartyPage.jsx', 'utf8');

// 1. Root container: overflow-y-auto on mobile, hidden on lg
c = c.replace(
  'className="h-full bg-[#050505] text-white font-sans selection:bg-white/20 relative overflow-hidden flex flex-col"',
  'className="h-full bg-[#050505] text-white font-sans selection:bg-white/20 relative lg:overflow-hidden overflow-y-auto custom-scrollbar flex flex-col"'
);

// 2. main container: lg:min-h-0
c = c.replace(
  'className="max-w-7xl mx-auto w-full px-4 sm:px-8 flex-1 flex flex-col relative z-10 pb-6 min-h-0"',
  'className="max-w-7xl mx-auto w-full px-4 sm:px-8 flex-1 flex flex-col relative z-10 pb-6 lg:min-h-0"'
);

// 3. Results layout wrapper
c = c.replace(
  'className="w-full flex flex-col-reverse lg:flex-row gap-8 pb-4 flex-1 min-h-0"',
  'className="w-full flex flex-col-reverse lg:flex-row gap-8 pb-4 lg:flex-1 lg:min-h-0"'
);

// 4. Left Pane (History)
c = c.replace(
  'className="lg:w-[30%] flex flex-col gap-6 min-h-0 h-[400px] lg:h-full shrink-0 lg:shrink"',
  'className="lg:w-[30%] flex flex-col gap-6 lg:min-h-0 lg:h-full shrink-0"'
);

// Make history inner container not fixed height on mobile, but maybe max-h
c = c.replace(
  'className="bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-[2.5rem] p-6 lg:p-8 flex flex-col min-h-0 h-full"',
  'className="bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-[2.5rem] p-6 lg:p-8 flex flex-col lg:min-h-0 h-full max-h-[400px] lg:max-h-none"'
);

// 5. Right Pane (Scrollable Content)
c = c.replace(
  'className="lg:w-[70%] flex flex-col gap-8 min-h-0 overflow-y-auto custom-scrollbar pr-4 pb-12"',
  'className="lg:w-[70%] flex flex-col gap-8 lg:min-h-0 lg:overflow-y-auto custom-scrollbar lg:pr-4 pb-12"'
);

// Fix input form width for mobile so search button and input don't overflow
// They are currently flex-col sm:flex-row, which is fine, but checking it:
// w-full max-w-2xl mt-8 => form has flex flex-col sm:flex-row gap-4
// px-10 h-16 rounded-full ... => fine
// Maybe padding in result header: p-6 lg:p-14 => fine.

fs.writeFileSync('src/pages/CounterpartyPage.jsx', c);
