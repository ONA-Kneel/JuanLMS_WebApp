import { useLocation } from 'react-router-dom';

export default function PdfViewer() {
  const query = new URLSearchParams(useLocation().search);
  const fileUrl = query.get('file');

  const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
  // If fileUrl is not absolute, prefix with API_BASE
  const resolvedFileUrl = fileUrl && !/^https?:\/\//.test(fileUrl) ? `${API_BASE}/${fileUrl.replace(/^\/+/, "")}` : fileUrl;

  if (!fileUrl) {
    return <div className="flex items-center justify-center h-screen text-red-600">No PDF file specified.</div>;
  }

  return (
    <iframe
      src={resolvedFileUrl}
      style={{ width: '100vw', height: '100vh', border: 'none' }}
      title="PDF Viewer"
    />
  );
} 