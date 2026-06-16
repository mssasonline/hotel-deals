'use client';

import { SaveCancelButtons } from './SaveCancelButtons';

export interface FieldProps {
  fieldKey: string;
  label: string;
  displayValue: string;
  editContent: React.ReactNode;
  isLast?: boolean;
  isEditing: boolean;
  saving: boolean;
  onEdit: (fieldKey: string) => void;
  onSave: (fieldKey: string) => void;
  onCancel: () => void;
  editLabel: string;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
  notProvided: string;
}

export function Field({
  fieldKey,
  label,
  displayValue,
  editContent,
  isLast = false,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  editLabel,
  saveLabel,
  savingLabel,
  cancelLabel,
  notProvided,
}: FieldProps) {
  return (
    <div className={`px-6 py-4 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      {!isEditing ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${displayValue ? 'text-gray-900' : 'text-gray-300 italic'}`}>
              {displayValue || notProvided}
            </p>
          </div>
          <button
            onClick={() => onEdit(fieldKey)}
            className="shrink-0 text-sm text-brand-blue hover:text-blue-700 font-semibold transition-colors"
          >
            {editLabel}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{label}</p>
          {editContent}
          <SaveCancelButtons
            fieldKey={fieldKey}
            saving={saving}
            onSave={onSave}
            onCancel={onCancel}
            saveLabel={saveLabel}
            savingLabel={savingLabel}
            cancelLabel={cancelLabel}
          />
        </div>
      )}
    </div>
  );
}
