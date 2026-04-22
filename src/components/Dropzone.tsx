import React, { useCallback, useState } from 'react';

interface DropzoneProps {
  onFileDrop: (files: File[]) => void;
  loading: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileDrop, loading }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        onFileDrop(files);
      } else {
        alert('Por favor, sube solo archivos PDF.');
      }
    }
  }, [onFileDrop]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        onFileDrop(files);
      } else {
        alert('Por favor, sube solo archivos PDF.');
      }
    }
  };

  return (
    <div 
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileUpload')?.click()}
    >
      <input 
        type="file" 
        id="fileUpload" 
        multiple 
        accept="application/pdf" 
        style={{ display: 'none' }} 
        onChange={handleChange}
      />
      <div className="dropzone-icon">📄</div>
      {loading ? (
        <p>Procesando PDF(s)...</p>
      ) : (
        <>
          <p className="font-bold">Arrastra y suelta tus PDF de AFIP aquí</p>
          <p className="text-muted text-sm mt-4">o haz clic para seleccionar archivos</p>
        </>
      )}
    </div>
  );
};
