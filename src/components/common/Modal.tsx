import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full ${maxWidth} bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1B3A5C] bg-[#061426]">
          <div>
            <h3 className="text-lg font-bold text-[#F4F8FF] tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#9EB2CC] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
