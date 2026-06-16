'use client';

import type { getTranslations } from '@/lib/i18n/translations';

type Translations = ReturnType<typeof getTranslations>;

interface DeleteAccountSectionProps {
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
  deleting: boolean;
  onDeleteAccount: () => void;
  t: Translations;
}

export function DeleteAccountSection({
  showDeleteModal,
  setShowDeleteModal,
  deleting,
  onDeleteAccount,
  t,
}: DeleteAccountSectionProps) {
  return (
    <>
      <section>
        <h2 className="text-base font-bold text-red-600 mb-3 px-1">{t['account.deleteAccount']}</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{t['account.deleteWarning']}</p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
                >
                  {t['account.deleteButton']}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!deleting) setShowDeleteModal(false); }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t['account.deleteConfirmTitle']}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{t['account.deleteConfirmMessage']}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? t['account.deleting'] : t['account.deleteConfirmButton']}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t['account.deleteCancelButton']}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
