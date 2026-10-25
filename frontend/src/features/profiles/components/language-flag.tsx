import type {ProfileLocale} from '../profile-contract'
export const languageFlags={
 'pt-BR':<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#009739"/><path d="m14 2 12 8-12 8L2 10Z" fill="#ffdf00"/><circle cx="14" cy="10" r="4.5" fill="#002776"/><path d="M10 8.7q4-.5 8 2" stroke="white" fill="none"/></svg>,
 en:<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#fff"/>{[0,4,8,12,16].map(y=><path key={y} d={`M0 ${y+1}h28`} stroke="#b22234" strokeWidth="2"/>)}<path d="M0 0h13v11H0Z" fill="#3c3b6e"/><path d="M2 2h9M2 5h9M2 8h9" stroke="white" strokeDasharray="1 2"/></svg>,
 es:<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#aa151b"/><path d="M0 5h28v10H0Z" fill="#f1bf00"/><path d="M8 8h4v4a2 2 0 0 1-4 0Z" fill="#aa151b"/></svg>,
} satisfies Record<ProfileLocale,import('react').ReactNode>
