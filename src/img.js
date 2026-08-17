// Redimensiona e comprime a foto antes de salvar no banco local
// (fotos de celular têm 3–12 MB; aqui viram ~150–250 KB sem perda visível no app).
export function comprimirImagem(file, maxLado = 1280, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * escala))
      canvas.height = Math.max(1, Math.round(img.height * escala))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', qualidade))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não consegui ler essa imagem'))
    }
    img.src = url
  })
}
