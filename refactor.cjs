const fs = require('fs');
let code = fs.readFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', 'utf-8');

const renderDiffViewRegex = /const renderDiffView = \(\) => \{[\s\S]*?\}\n\s*const isDirty =/g;
code = code.replace(renderDiffViewRegex, 'const isDirty =');

const wrapperRegex = /\{diffResult \? \(\s*<div className="h-full">\s*\{renderDiffView\(\)\}\s*<\/div>\s*\) : \(\s*(<div className="flex flex-col xl:flex-row gap-6 h-full">)/g;
code = code.replace(wrapperRegex, '$1');

code = code.replace(/<\/div>\s*\)\}\s*<\/motion\.div>/g, '</div>\n          </motion.div>');

const headerOld = `<div className="flex items-center gap-2">
                      <FileText size={16} className="text-steel-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-steel-400">Редактор документа</span>
                    </div>`;
const headerNew = `<div className="flex items-center gap-2">
                      <FileText size={16} className="text-steel-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-steel-400">Редактор документа</span>
                      {initialDocText && contractText !== initialDocText && (
                        <button 
                          onClick={() => setDiffResult(diffResult ? null : diffLines(initialDocText, contractText))}
                          className={\`ml-4 px-3 py-1 rounded-md text-xs font-medium transition-colors \${diffResult ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-chrome-500/10 text-chrome-400 hover:bg-chrome-500/20'}\`}
                        >
                          {diffResult ? 'Скрыть изменения' : 'Сравнить с оригиналом'}
                        </button>
                      )}
                    </div>`;
code = code.replace(headerOld, headerNew);

const textareaOld = `<textarea
                        ref={docScrollRef}
                        value={contractText}
                        onChange={(e) => setContractText(e.target.value)}
                        className="w-full h-full max-w-[850px] bg-transparent resize-none focus:outline-none p-8 md:p-12 font-serif text-[15px] md:text-[16px] leading-[1.8] text-white/90 placeholder-white/20 custom-scrollbar"
                        placeholder="Вставьте текст документа или загрузите файл..."
                      />`;
const textareaNew = `{diffResult ? (
                      <div className="w-full h-full max-w-[850px] p-8 md:p-12 font-serif text-[15px] md:text-[16px] leading-[1.8] text-white/90 overflow-y-auto custom-scrollbar diff-viewer">
                        {diffResult.map((part, i) => {
                          if (part.added) {
                            return <span key={i} className="bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap font-medium">{part.value}</span>;
                          } else if (part.removed) {
                            return <span key={i} className="bg-red-500/20 text-red-400/80 line-through px-1 py-0.5 rounded mx-0.5 whitespace-pre-wrap">{part.value}</span>;
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
                        className="w-full h-full max-w-[850px] bg-transparent resize-none focus:outline-none p-8 md:p-12 font-serif text-[15px] md:text-[16px] leading-[1.8] text-white/90 placeholder-white/20 custom-scrollbar"
                        placeholder="Вставьте текст документа или загрузите файл..."
                      />
                    )}`;
code = code.replace(textareaOld, textareaNew);

fs.writeFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', code, 'utf-8');
console.log('SUCCESS');
