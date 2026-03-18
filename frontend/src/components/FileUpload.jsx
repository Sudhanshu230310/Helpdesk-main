// ============================================================
// FileUpload — Drag-and-drop file upload component
// ============================================================
import { useState, useRef } from 'react';
import { HiOutlineCloudUpload, HiOutlineDocument, HiOutlineX } from 'react-icons/hi';

const FileUpload = ({ files, onChange, maxFiles = 5 }) => {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    };

    const handleSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const addFiles = (newFiles) => {
        const combined = [...files, ...newFiles].slice(0, maxFiles);
        onChange(combined);
    };

    const removeFile = (index) => {
        const updated = files.filter((_, i) => i !== index);
        onChange(updated);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div>
            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${dragOver
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-300 hover:border-dark-500 hover:bg-gray-50'
                    }`}
            >
                <HiOutlineCloudUpload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-primary-400' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-500">
                    <span className="text-primary-400 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-dark-600 mt-1">
                    PDF, DOC, XLS, Images (Max {maxFiles} files, 10MB each)
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    onChange={handleSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
                />
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 animate-fade-in"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <HiOutlineDocument className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">{file.name}</span>
                                <span className="text-xs text-dark-600 flex-shrink-0">{formatSize(file.size)}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                            >
                                <HiOutlineX className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
