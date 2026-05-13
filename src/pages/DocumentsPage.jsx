import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { FileText, Download, Trash2, Plus, FileSignature, UploadCloud, X, Loader2 } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import CustomSelect from '../components/CustomSelect';
import { docsApi } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [docs, setDocs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docDesc, setDocDesc] = useState('');
  const [generating, setGenerating] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const list = await docsApi.list();
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

  useEffect(() => { loadDocs(); }, [loadDocs]);

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
    <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <FileText className="text-chrome-400" />
              {t('docs_title')}
            </h1>
            <p className="text-steel-400 text-sm mt-1 tracking-wide">Управляйте вашими договорами, заявлениями и сгенерированными актами.</p>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <MagneticButton as="button" className="flex-1 sm:flex-none btn-secondary bg-obsidian-800/50 hover:bg-obsidian-800 border border-obsidian-700/80 text-sm py-2 px-5 shadow-sm text-steel-300">
              <Plus size={16} className="mr-2 inline" /> Загрузить
            </MagneticButton>
            <MagneticButton as="button" onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none btn-primary text-sm py-2 px-5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <FileSignature size={16} className="mr-2 inline" /> Создать новый
            </MagneticButton>
          </div>
        </motion.div>

        {/* Upload area */}
        <motion.div
          variants={itemVariants}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          className={`relative p-10 text-center mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group
            ${dragActive ? 'border-chrome-400 bg-chrome-500/10' : 'border-obsidian-600/70 hover:border-chrome-500/50 bg-obsidian-900/40'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-obsidian-950/20 pointer-events-none" />
          <motion.div 
            className="flex justify-center mb-4 text-steel-500 group-hover:text-white transition-colors"
            animate={{ y: dragActive ? [0, -5, 0] : 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <UploadCloud size={48} strokeWidth={1.5} />
          </motion.div>
          <p className="text-white font-medium mb-1 tracking-wide">{t('docs_upload')}</p>
          <p className="text-xs text-steel-500 font-mono tracking-wider">PDF, DOCX, DOC — макс. 10 МБ</p>
        </motion.div>

        {/* Documents Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {docs.map((doc) => (
            <div key={doc.id} className="glass-card p-5 border border-obsidian-700/80 hover:border-chrome-500/50 transition-colors group flex flex-col h-full bg-obsidian-900/60 shadow-lg">
              <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-xl shadow-inner border border-white/5 ${doc.type === 'generated' ? 'chrome-gradient' : 'bg-obsidian-800'}`}>
                  <FileText className={doc.type === 'generated' ? 'text-obsidian-950' : 'text-chrome-400'} size={24} strokeWidth={1.5} />
                </div>
                {doc.type === 'generated' && (
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-white/10 text-chrome-100 px-3 py-1.5 rounded-full border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                    Auto-Gen
                  </span>
                )}
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-relaxed group-hover:text-chrome-300 transition-colors">
                {doc.name.replace(/_/g, ' ')}
              </h3>
              
              <div className="mt-auto pt-4 flex items-center justify-between text-[11px] font-mono tracking-wider text-steel-500 border-t border-obsidian-700/50 mt-4">
                <span>{doc.date}</span>
                <span>{doc.size}</span>
              </div>
              
              {/* Floating action buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <button onClick={() => docsApi.download(doc.id)} className="p-2.5 bg-obsidian-800 border border-obsidian-600 text-chrome-400 hover:text-white rounded-xl shadow-xl hover:border-chrome-500 transition-colors">
                  <Download size={14} />
                </button>
                <button onClick={() => handleDelete(doc.id)} className="p-2.5 bg-obsidian-800 border border-obsidian-600 text-steel-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 rounded-xl shadow-xl transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          
        </motion.div>
        
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="glass-card w-full max-w-lg p-6 border border-obsidian-700/80 shadow-2xl relative"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-steel-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FileSignature className="text-chrome-400" size={20} /> Сгенерировать документ
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-steel-400 uppercase tracking-widest mb-2">Тип документа</label>
                  <CustomSelect 
                    value={docType} 
                    onChange={(e) => setDocType(e.target.value)}
                    options={[
                      { value: 'contract', label: 'Договор (услуг, аренды и т.д.)' },
                      { value: 'claim', label: 'Исковое заявление в суд' },
                      { value: 'complaint', label: 'Жалоба / Претензия' },
                      { value: 'statement', label: 'Официальное заявление' },
                    ]}
                    className="w-full text-sm mb-4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-steel-400 uppercase tracking-widest mb-2">Описание ситуации</label>
                  <textarea 
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                    placeholder="Опишите суть... (например: договор на разработку ПО между ТОО Ромашка и ИП Иванов на сумму 500 тыс тенге)"
                    className="w-full h-32 bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-chrome-500 transition-colors resize-none"
                  />
                </div>
                <MagneticButton 
                  as="button" 
                  disabled={generating || !docDesc.trim()}
                  onClick={handleGenerate}
                  className="w-full btn-primary text-sm py-3 px-5 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex justify-center items-center h-12"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : 'Сгенерировать'}
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
