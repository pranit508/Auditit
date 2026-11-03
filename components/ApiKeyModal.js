// Component: Gemini API Key Configuration Modal

export function renderApiKeyModal(container, currentKey, onSave, onClose) {
  container.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2">
            <span class="text-base">🔑</span>
            <h3 class="text-sm font-bold text-slate-900">Configure Multimodal Gemini AI</h3>
          </div>
          <button id="btn-close-key-modal" class="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        <p class="text-xs text-slate-500 mt-3 leading-relaxed">
          Provide your Google Gemini API Key or OAuth Bearer token to enable live multimodal OCR on your uploaded bills. 
          The key is saved only in your local browser storage and never shared.
        </p>

        <div class="mt-4">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Gemini API Key or OAuth Token</label>
          <input 
            type="password" 
            id="input-api-key" 
            value="${currentKey || ''}"
            placeholder="AIzaSy... or AQ...." 
            class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span class="text-[10px] text-slate-400 mt-1 block">Leave empty to use built-in local smart simulation mode.</span>
        </div>

        <div class="mt-6 flex items-center justify-end space-x-2">
          <button id="btn-cancel-key" class="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button id="btn-save-key" class="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-all">
            Save Key
          </button>
        </div>

      </div>
    </div>
  `;

  const btnClose = container.querySelector("#btn-close-key-modal");
  const btnCancel = container.querySelector("#btn-cancel-key");
  const btnSave = container.querySelector("#btn-save-key");
  const inputKey = container.querySelector("#input-api-key");

  if (btnClose) btnClose.addEventListener("click", onClose);
  if (btnCancel) btnCancel.addEventListener("click", onClose);
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      onSave(inputKey.value.trim());
    });
  }
}
