import { useLocation } from 'react-router-dom';

export default function PdfViewer() {
  const query = new URLSearchParams(useLocation().search);
  const fileUrl = query.get('file');

  if (!fileUrl) {
    return <div className="flex items-center justify-center h-screen text-red-600">No PDF file specified.</div>;
  }

  return (
    <iframe
      src={fileUrl}
      style={{ width: '100vw', height: '100vh', border: 'none' }}
      title="PDF Viewer"
    />
  );
} 