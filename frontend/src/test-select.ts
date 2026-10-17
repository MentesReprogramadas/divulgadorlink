import { fireEvent, waitFor } from '@testing-library/react'

export async function chooseSelect(control: HTMLElement, value: string) {
  fireEvent.click(control)
  const option = await waitFor(() => {
    const result = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(item => item.dataset.value === value)
    if (!result) throw new Error('Opção não encontrada: ' + value)
    return result
  })
  fireEvent.pointerDown(option)
  fireEvent.click(option)
  await waitFor(() => { if (control.querySelector('[data-select-value]')?.getAttribute('data-select-value') !== value) throw new Error('Seleção ainda não confirmada.') })
}
