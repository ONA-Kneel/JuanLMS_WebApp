import { useLocation } from 'react-router-dom';
import { getFileUrl } from '../utils/imageUtils';

export default function PdfViewer() {
  const query = new URLSearchParams(useLocation().search);
  const fileUrl = query.get('file');

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  // Use the utility function to resolve the file URL
  const resolvedFileUrl = getFileUrl(fileUrl, API_BASE);

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