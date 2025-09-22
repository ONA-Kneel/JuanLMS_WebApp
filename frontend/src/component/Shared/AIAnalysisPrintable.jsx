import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, PieController);

const AIAnalysisPrintable = forwardRef(function AIAnalysisPrintable(props, ref) {
  const { aiAnalysis, selectedSchoolYear, selectedTerm, filteredActivities = [], assignmentsCount = 0, quizzesCount = 0 } = props;

  const mainChartRef = useRef(null);
  const sectionChartRef = useRef(null);
  const trackChartRef = useRef(null);
  const strandChartRef = useRef(null);

  const mainChartInst = useRef(null);
  const sectionChartInst = useRef(null);
  const trackChartInst = useRef(null);
  const strandChartInst = useRef(null);

  const formatAnalysisToHtml = useCallback((input) => {
    if (!input) return '';
    const escapeHtml = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const lines = escapeHtml(input).split(/\r?\n/);
    const html = [];
    let inUl = false;
    let inOl = false;
    const closeLists = () => { if (inUl) { html.push('</ul>'); inUl = false; } if (inOl) { html.push('</ol>'); inOl = false; } };
    for (let raw of lines) {
      let line = raw.trimEnd();
      if (!line.trim()) { closeLists(); html.push('<p style="margin: 0 0 8px 0;">&nbsp;</p>'); continue; }
      if (/^[-*_]{3,}$/.test(line)) { closeLists(); html.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"/>'); continue; }
      const hMatch = line.match(/^(#{1,6})\s*(.+)$/);
      if (hMatch) { closeLists(); html.push(`<h4 style="font-size:16px;font-weight:700;margin:14px 0 8px;">${hMatch[2]}</h4>`); continue; }
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) { if (!inOl) { closeLists(); html.push('<ol style="margin:6px 0 8px 20px;">'); inOl = true; } html.push(`<li style="margin:2px 0;">${olMatch[1]}</li>`); continue; }
      const ulMatch = line.match(/^[-•]\s+(.+)$/);
      if (ulMatch) { if (!inUl) { closeLists(); html.push('<ul style="margin:6px 0 8px 20px;">'); inUl = true; } html.push(`<li style="margin:2px 0;">${ulMatch[1]}</li>`); continue; }
      let paragraph = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:0 4px;border-radius:4px;">$1</code>');
      closeLists();
      html.push(`<p style="margin: 0 0 8px 0;">${paragraph}</p>`);
    }
    closeLists();
    return html.join('');
  }, []);

  const splitContent = useMemo(() => {
    const variants = [
      'Faculty Performance & Activity Levels Analysis',
      'Faculty Performance & Activity Levels',
      'Faculty Performance and Activity Levels'
    ];
    let idx = -1; let used = '';
    for (const v of variants) { const i = (aiAnalysis || '').indexOf(v); if (i !== -1) { idx = i; used = v; break; } }
    const headEnd = idx === -1 ? -1 : idx + used.length;
    const before = idx === -1 ? (aiAnalysis || '') : (aiAnalysis || '').slice(0, headEnd);
    const after = idx === -1 ? '' : (aiAnalysis || '').slice(headEnd);
    return { before, after };
  }, [aiAnalysis]);

  const distributions = useMemo(() => {
    const countBy = (key) => {
      const map = new Map();
      for (const it of filteredActivities) {
        const label = it[key] || 'Unknown';
        map.set(label, (map.get(label) || 0) + 1);
      }
      return { labels: Array.from(map.keys()), data: Array.from(map.values()) };
    };
    return {
      section: countBy('sectionName'),
      track: countBy('trackName'),
      strand: countBy('strandName'),
    };
  }, [filteredActivities]);

  useEffect(() => {
    const destroy = (inst) => { if (inst && inst.destroy) inst.destroy(); };
    destroy(mainChartInst.current); destroy(sectionChartInst.current); destroy(trackChartInst.current); destroy(strandChartInst.current);
    const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#22c55e','#6366f1','#e11d48','#14b8a6'];
    const toColors = (n) => Array.from({ length: n }, (_, i) => palette[i % palette.length]);

    if (mainChartRef.current && assignmentsCount + quizzesCount > 0) {
      mainChartInst.current = new Chart(mainChartRef.current.getContext('2d'), {
        type: 'pie',
        data: { labels: ['Assignments','Quizzes'], datasets: [{ data: [assignmentsCount, quizzesCount], backgroundColor: ['#f59e0b','#3b82f6'], borderColor: '#ffffff', borderWidth: 2 }] },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    }
    if (sectionChartRef.current && (distributions.section.data.reduce((a,b)=>a+b,0) > 0)) {
      sectionChartInst.current = new Chart(sectionChartRef.current.getContext('2d'), {
        type: 'pie',
        data: { labels: distributions.section.labels, datasets: [{ data: distributions.section.data, backgroundColor: toColors(distributions.section.data.length), borderColor: '#ffffff', borderWidth: 2 }] },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    }
    if (trackChartRef.current && (distributions.track.data.reduce((a,b)=>a+b,0) > 0)) {
      trackChartInst.current = new Chart(trackChartRef.current.getContext('2d'), {
        type: 'pie',
        data: { labels: distributions.track.labels, datasets: [{ data: distributions.track.data, backgroundColor: toColors(distributions.track.data.length), borderColor: '#ffffff', borderWidth: 2 }] },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    }
    if (strandChartRef.current && (distributions.strand.data.reduce((a,b)=>a+b,0) > 0)) {
      strandChartInst.current = new Chart(strandChartRef.current.getContext('2d'), {
        type: 'pie',
        data: { labels: distributions.strand.labels, datasets: [{ data: distributions.strand.data, backgroundColor: toColors(distributions.strand.data.length), borderColor: '#ffffff', borderWidth: 2 }] },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: false }
      });
    }
    return () => {
      destroy(mainChartInst.current); destroy(sectionChartInst.current); destroy(trackChartInst.current); destroy(strandChartInst.current);
    };
  }, [assignmentsCount, quizzesCount, distributions]);

  return (
    <div ref={ref} className="prose max-w-none">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
        <h4 className="text-lg font-semibold text-blue-800 mb-2">Analysis Summary</h4>
        <p className="text-blue-700">This AI-powered analysis provides insights into faculty performance, student engagement, and recommendations for improving academic outcomes.</p>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        <span className="font-medium">Educational Analytics Report:</span> {selectedSchoolYear} {selectedTerm ? `- ${selectedTerm}` : ''}
      </div>
      <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAnalysisToHtml(splitContent.before) }} />
      <div className="flex flex-col gap-6 py-3">
        <div className="flex items-center justify-center">
          <canvas ref={mainChartRef} width={220} height={220} style={{ width: 220, height: 220 }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center">
            <div className="text-sm font-medium mb-2">By Section</div>
            <canvas ref={sectionChartRef} width={180} height={180} style={{ width: 180, height: 180 }} />
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm font-medium mb-2">By Track</div>
            <canvas ref={trackChartRef} width={180} height={180} style={{ width: 180, height: 180 }} />
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm font-medium mb-2">By Strand</div>
            <canvas ref={strandChartRef} width={180} height={180} style={{ width: 180, height: 180 }} />
          </div>
        </div>
      </div>
      <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAnalysisToHtml(splitContent.after) }} />
    </div>
  );
});

export default AIAnalysisPrintable;


