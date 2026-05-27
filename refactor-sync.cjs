const fs = require('fs');

let code = fs.readFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', 'utf-8');

// 1. Add showSideBySide and refs
code = code.replace(
  'const [diffResult, setDiffResult] = useState(null);',
  'const [diffResult, setDiffResult] = useState(null);\n  const [showSideBySide, setShowSideBySide] = useState(false);\n  const originalScrollRef = useRef(null);\n  const modifiedScrollRef = useRef(null);'
);

// 2. Add scroll sync handlers before handleQuickFix
const scrollHandlers = `
  const handleScrollOriginal = (e) => {
    if (modifiedScrollRef.current) {
      modifiedScrollRef.current.scrollTop = e.target.scrollTop;
    }
  };
  const handleScrollModified = (e) => {
    if (originalScrollRef.current) {
      originalScrollRef.current.scrollTop = e.target.scrollTop;
    }
  };
  const handleQuickFix`;
code = code.replace('const handleQuickFix', scrollHandlers);

// 3. Fix downloadPdfReport
const downloadOld = `const response = await fetch(\`http://localhost:8000/api/audit/history/\${activeAuditId}/report\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('token')}\`
        }
      });`;
const downloadNew = `const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
      const response = await fetch(\`\${apiBase}/audit/history/\${activeAuditId}/report\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('auth_token')}\`
        }
      });`;
code = code.replace(downloadOld, downloadNew);

// 4. Update the Center Pane UI
const headerButtonOld = `{initialDocText && contractText !== initialDocText && (
                        <button 
                          onClick={() => setDiffResult(diffResult ? null : diffLines(initialDocText, contractText))}
                          className={\`ml-4 px-3 py-1 rounded-md text-xs font-medium transition-colors \${diffResult ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-chrome-500/10 text-chrome-400 hover:bg-chrome-500/20'}\`}
                        >
                          {diffResult ? 'Скрыть изменения' : 'Сравнить с оригиналом'}
                        </button>
                      )}`;
const headerButtonNew = `{initialDocText && contractText !== initialDocText && (
                        <button 
                          onClick={() => setShowSideBySide(!showSideBySide)}
                          className={\`ml-4 px-3 py-1 rounded-md text-xs font-medium transition-colors \${showSideBySide ? 'bg-chrome-500/30 text-chrome-300' : 'bg-chrome-500/10 text-chrome-400 hover:bg-chrome-500/20'}\`}
                        >
                          {showSideBySide ? 'Закрыть сравнение' : 'Сравнить с оригиналом'}
                        </button>
                      )}`;
code = code.replace(headerButtonOld, headerButtonNew);

const centerPaneOld = `<div className="flex flex-1 overflow-hidden relative bg-[#050505] justify-center">
                    {diffResult ? (
                      <div className="w-full h-full max-w-[850px] bg-[#0b0c0f] border-x border-white/[0.05] p-8 sm:p-12 font-serif text-[15px] md:text-[16px] leading-[1.8] text-white/90 overflow-y-auto custom-scrollbar diff-viewer">
                        {diffResult.map((part, i) => {
                          if (part.added) {
                            return <span key={i} className="diff-highlight bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap font-medium">{part.value}</span>;
                          } else if (part.removed) {
                            return <span key={i} className="diff-highlight bg-red-500/20 text-red-400/80 line-through px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap">{part.value}</span>;
                          } else {
                            return <span key={i} className="whitespace-pre-wrap">{part.value}</span>;
                          }
                        })}
                      </div>
                    ) : (
                      <textarea
                        ref={docScrollRef}
                        value={contractText}
                        onChange={(e) => {
                          setContractText(e.target.value);
                          if (diffResult) setDiffResult(null);
                        }}
                        placeholder="Текст документа..."
                        className="w-full max-w-[850px] h-full bg-[#0b0c0f] border-x border-white/[0.05] shadow-2xl p-8 sm:p-12 font-serif text-[15px] leading-[1.8] text-steel-200 resize-none outline-none custom-scrollbar"
                        style={{ willChange: 'scroll-position' }}
                      />
                    )}
                  </div>`;
const centerPaneNew = `<div className="flex flex-1 overflow-hidden relative bg-[#050505] justify-center">
                    {showSideBySide ? (
                      <div className="flex w-full h-full">
                        <div className="flex-1 flex flex-col border-r border-white/5">
                          <div className="bg-obsidian-900 px-6 py-2 text-[10px] text-steel-400 font-bold uppercase tracking-widest border-b border-white/5 shadow-md">Оригинал</div>
                          <div 
                            className="flex-1 overflow-y-auto p-8 font-serif text-[14px] leading-[1.8] text-white/60 whitespace-pre-wrap custom-scrollbar"
                            onScroll={handleScrollOriginal}
                            ref={originalScrollRef}
                          >
                            {initialDocText}
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col bg-[#0b0c0f]">
                          <div className="bg-emerald-950/30 px-6 py-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest border-b border-white/5 shadow-md">Измененный</div>
                          <div 
                            className="flex-1 overflow-y-auto p-8 font-serif text-[14px] leading-[1.8] text-white/90 whitespace-pre-wrap custom-scrollbar diff-viewer"
                            onScroll={handleScrollModified}
                            ref={modifiedScrollRef}
                          >
                            {diffResult ? diffResult.map((part, i) => {
                              if (part.added) {
                                return <span key={i} className="diff-highlight bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap font-medium">{part.value}</span>;
                              } else if (part.removed) {
                                return <span key={i} className="diff-highlight bg-red-500/20 text-red-400/80 line-through px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap">{part.value}</span>;
                              } else {
                                return <span key={i} className="whitespace-pre-wrap">{part.value}</span>;
                              }
                            }) : contractText}
                          </div>
                        </div>
                      </div>
                    ) : diffResult ? (
                      <div className="w-full h-full max-w-[850px] bg-[#0b0c0f] border-x border-white/[0.05] p-8 sm:p-12 font-serif text-[15px] md:text-[16px] leading-[1.8] text-white/90 overflow-y-auto custom-scrollbar diff-viewer">
                        {diffResult.map((part, i) => {
                          if (part.added) {
                            return <span key={i} className="diff-highlight bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap font-medium">{part.value}</span>;
                          } else if (part.removed) {
                            return <span key={i} className="diff-highlight bg-red-500/20 text-red-400/80 line-through px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap">{part.value}</span>;
                          } else {
                            return <span key={i} className="whitespace-pre-wrap">{part.value}</span>;
                          }
                        })}
                      </div>
                    ) : (
                      <textarea
                        ref={docScrollRef}
                        value={contractText}
                        onChange={(e) => {
                          setContractText(e.target.value);
                          if (diffResult) setDiffResult(null);
                        }}
                        placeholder="Текст документа..."
                        className="w-full max-w-[850px] h-full bg-[#0b0c0f] border-x border-white/[0.05] shadow-2xl p-8 sm:p-12 font-serif text-[15px] leading-[1.8] text-steel-200 resize-none outline-none custom-scrollbar"
                        style={{ willChange: 'scroll-position' }}
                      />
                    )}
                  </div>`;
code = code.replace(centerPaneOld, centerPaneNew);

fs.writeFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', code, 'utf-8');
console.log('SUCCESS');
