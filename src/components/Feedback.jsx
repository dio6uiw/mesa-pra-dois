import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, Undo2 } from 'lucide-react'

const FeedbackCtx = createContext(null)
export const useFeedback = () => useContext(FeedbackCtx)

const DURACAO_TOAST = 2400
const DURACAO_UNDO = 7000 // 4–10s é a faixa recomendada; 7s dá tempo de ler e decidir

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg, icon) => {
    clearTimeout(timer.current)
    setToast({ msg, icon })
    if (navigator.vibrate) navigator.vibrate(12)
    timer.current = setTimeout(() => setToast(null), DURACAO_TOAST)
  }, [])

  // Toast com ação de desfazer — para exclusões reversíveis.
  const showUndo = useCallback((msg, onUndo) => {
    clearTimeout(timer.current)
    setToast({ msg, onUndo })
    if (navigator.vibrate) navigator.vibrate(12)
    timer.current = setTimeout(() => setToast(null), DURACAO_UNDO)
  }, [])

  // ask({titulo, texto, okLabel, danger}) → Promise<boolean>
  const ask = useCallback(opts => new Promise(resolve => {
    setConfirm(anterior => {
      anterior?.resolve(false) // nao deixa a promise anterior pendurada
      return { ...opts, resolve }
    })
  }), [])

  function answer(v) {
    confirm?.resolve(v)
    setConfirm(null)
  }

  async function desfazer() {
    const acao = toast?.onUndo
    clearTimeout(timer.current)
    setToast(null)
    if (acao) await acao()
  }

  return (
    <FeedbackCtx.Provider value={{ showToast, showUndo, ask }}>
      {children}
      {toast && (
        <div className="toast-wrap">
          <div className="toast" role="status" aria-live="polite">
            {toast.onUndo ? null : (toast.icon || <CheckCircle2 size={18} />)}
            <span style={{ flex: 1 }}>{toast.msg}</span>
            {toast.onUndo && (
              <button className="toast-acao" onClick={desfazer}>
                <Undo2 size={15} /> Desfazer
              </button>
            )}
          </div>
        </div>
      )}
      {confirm && (
        <div className="sheet-back" onClick={() => answer(false)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="t">{confirm.titulo}</div>
            {confirm.texto && <div className="s">{confirm.texto}</div>}
            <div className="acoes">
              <button className="btn ghost" onClick={() => answer(false)}>Cancelar</button>
              <button className={`btn ${confirm.danger ? 'danger' : 'primary'}`} onClick={() => answer(true)}>
                {confirm.okLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackCtx.Provider>
  )
}
