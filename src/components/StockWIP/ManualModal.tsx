import React, { useState } from 'react';
interface Props {
  open: boolean;
  initial: {
    ITEM?: string | null;
    SIZE?: string | null;
    COLOR?: string | null;
    PO?: string | null;
  };
  onClose: () => void;
  onSave: (form: {
    ITEM: string;
    SIZE: string;
    COLOR: string;
    PO: string;
  }) => Promise<void>;
}
const ManualModal: React.FC<Props> = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState({
    ITEM: initial.ITEM ?? '',
    SIZE: initial.SIZE ?? '',
    COLOR: initial.COLOR ?? '',
    PO: initial.PO ?? '',
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded w-96 space-y-4">
        <h2 className="text-lg font-bold">Edit WIP Manual</h2>

        {['ITEM','SIZE','COLOR','PO'].map(k => (
          <input
            key={k}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
            placeholder={k}
            value={(form as any)[k]}
            onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
          />
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-600 rounded">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualModal;
