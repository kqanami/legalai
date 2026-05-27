import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { FileText, Download, Trash2, UploadCloud, X, Loader2, Sparkles, FileSignature, Search } from 'lucide-react';
import { docsApi } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } }
};

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [docs, setDocs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docDesc, setDocDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const loadDocs = useCallback(async (q = '') => {
    try {
      const list = await docsApi.list({ q });
      setDocs(list.map(d => ({
        id: d.id,
        name: d.name || d.original_filename,
        type: d.doc_type,
        date: d.created_at?.split('T')[0] || '',
        size: d.file_size > 1024 * 1024
          ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB`
          : `${(d.file_size / 1024).toFixed(0)} KB`,
      })));
    } catch (e) {
      console.error('Load docs error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocs(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, loadDocs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const generateType = params.get('generate');
    const descParam = params.get('desc');
    if (generateType) {
      const validTypes = ['contract', 'claim', 'complaint', 'statement'];
      if (validTypes.includes(generateType)) {
        setDocType(generateType);
        setIsModalOpen(true);
        if (descParam) {
          try {
            setDocDesc(decodeURIComponent(descParam));
          } catch (e) {
            setDocDesc(descParam);
          }
        }
      }
    }
  }, []);

  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        await docsApi.upload(f);
      }
      await loadDocs();
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await docsApi.remove(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleGenerate = async () => {
    if (!docDesc.trim()) return;
    setGenerating(true);
    try {
      await docsApi.generate(docType, docDesc);
      await loadDocs();
      setIsModalOpen(false);
      setDocDesc('');
    } catch (e) {
      console.error('Generate error:', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 pb-24">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
              Документы
            </h1>
            <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
              Управляйте загруженными договорами, актами и сгенерированными заявлениями.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-neutral-500" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-white/5 rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-colors"
                placeholder="Поиск документа..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Sparkles size={16} />
              AI Создание
            </button>
          </div>
        </motion.div>

        {/* Upload Area */}
        <input 
          type="file" 
          multiple 
          ref={fileInputRef}
          className="hidden" 
          onChange={(e) => handleUpload(e.target.files)} 
        />
        <motion.div
          variants={itemVariants}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
          className={`relative p-8 rounded-2xl border-2 border-dashed transition-colors cursor-pointer group flex flex-col items-center justify-center text-center
            ${dragActive ? 'border-white/40 bg-white/5' : 'border-white/10 hover:border-white/20 bg-transparent'}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
              <p className="text-white font-medium">Загрузка документов...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud size={24} className="text-neutral-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-white font-medium mb-1">Перетащите файлы сюда или нажмите для выбора</p>
              <p className="text-xs text-neutral-500">Поддерживаются PDF, DOCX, DOC (до 10 МБ)</p>
            </>
          )}
        </motion.div>

        {/* Documents Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {docs.map((doc) => (
            <motion.div 
              key={doc.id} 
              variants={itemVariants} 
              className="bg-neutral-900 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col group transition-colors relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.type === 'generated' ? 'bg-white text-black' : 'bg-neutral-800 text-white'}`}>
                  <FileText size={20} />
                </div>
                
                {doc.type === 'generated' && (
                  <span className="px-2 py-1 rounded bg-white/10 text-white text-[10px] font-bold tracking-widest uppercase">
                    AI Gen
                  </span>
                )}
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 pr-8" title={doc.name}>
                {doc.name.replace(/_/g, ' ')}
              </h3>
              
              <div className="mt-auto pt-4 flex items-center justify-between text-xs text-neutral-500 border-t border-white/5">
                <span>{doc.date}</span>
                <span>{doc.size}</span>
              </div>
              
              {/* Overlay Actions */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); docsApi.download(doc.id); }} 
                  className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                  title="Скачать"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} 
                  className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Invisible full-card clickable area to open doc */}
              <div 
                className="absolute inset-0 z-0 cursor-pointer"
                onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
              />
            </motion.div>
          ))}
          {docs.length === 0 && !uploading && (
            <div className="col-span-full py-12 text-center">
              <p className="text-neutral-500">Нет загруженных документов.</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Generation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 relative shadow-2xl"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6 pr-8">Сгенерировать документ</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Тип документа</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors appearance-none"
                  >
                    <option value="contract">Договор (услуг, аренды и т.д.)</option>
                    <option value="claim">Исковое заявление в суд</option>
                    <option value="complaint">Жалоба / Претензия</option>
                    <option value="statement">Официальное заявление</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Описание ситуации</label>
                  <textarea 
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                    placeholder="Например: договор на разработку ПО между ТОО Ромашка и ИП Иванов на сумму 500 тыс тенге..."
                    className="w-full h-32 bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors resize-none"
                  />
                </div>
                
                <button
                  disabled={generating || !docDesc.trim()}
                  onClick={handleGenerate}
                  className="w-full bg-white text-black font-semibold text-sm py-3 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center h-12"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : 'Сгенерировать'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
