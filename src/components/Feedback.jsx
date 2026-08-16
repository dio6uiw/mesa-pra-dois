import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const FeedbackCtx = createContext(null)
export const useFeedback = () => useContext(FeedbackCtx)

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg, icon) => {
    clearTimeout(timer.current)
    setToast({ msg, icon })
    if (navigator.vibrate) navigator.vibrate(12)
    timer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  // ask({titulo, texto, okLabel, danger}) → Promise<boolean>
  const ask = useCallback(opts => new Promise(resolve => {
    setConfirm({ ...opts, resolve })
  }), [])

  function answer(v) {
    confirm?.resolve(v)
    setConfirm(null)
  }

  return (
    <FeedbackCtx.Provider value={{ showToast, ask }}>
      {children}
      {toast && (
        <div className="toast-wrap">
          <div className="toast">
            {toast.icon || <CheckCircle2 size={18} />}
            {toast.msg}
          </div>
        </div>
      )}
      {confirm && (
        <div className="sheet-back" onClick={() => answer(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
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
