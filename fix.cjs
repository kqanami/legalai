const fs = require('fs');

let code = fs.readFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', 'utf-8');

const targetRegex = /const handleAnalyze = async \(\) => \{[\s\S]*?const handleReanalyze = async \(\) => \{/g;

const replacement = `const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError('');
    setActiveAuditId(null);
    try {
      const data = await auditApi.analyzeDocument(id);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      
      if (data.original_text) {
        setContractText(data.original_text);
        setOriginalAnalyzedText(data.original_text);
        setInitialDocText(data.original_text);
      }
      
      setActiveAuditId(data.id || null);
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadPdfReport = async () => {
    if (!activeAuditId) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
      const response = await fetch(\`\${apiBase}/audit/history/\${activeAuditId}/report\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('auth_token')}\`
        }
      });
      if (!response.ok) throw new Error('Ошибка скачивания отчета');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`Audit_Report_\${activeAuditId}.pdf\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReanalyze = async () => {`;

code = code.replace(targetRegex, replacement);

fs.writeFileSync('d:/agent1.0/ai-legal-kz/src/pages/DocumentWorkspace.jsx', code, 'utf-8');
console.log('SUCCESS');
