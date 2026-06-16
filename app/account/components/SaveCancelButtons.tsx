'use client';

interface SaveCancelButtonsProps {
  fieldKey: string;
  saving: boolean;
  onSave: (fieldKey: string) => void;
  onCancel: () => void;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
}

export function SaveCancelButtons({
  fieldKey,
  saving,
  onSave,
  onCancel,
  saveLabel,
  savingLabel,
  cancelLabel,
}: SaveCancelButtonsProps) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => onSave(fieldKey)}
        disabled={saving}
        className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
      >
        {saving ? savingLabel : saveLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
