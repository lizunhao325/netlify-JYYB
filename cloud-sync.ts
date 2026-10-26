const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SESSION_KEY = 'trading-journal-cloud-session'
export const CLOUD_KEYS = ['trading-journal-trades','trading-journal-limits','trading-journal-quotes','trading-journal-pinned','trading-journal-theme','trading-journal-capital','trading-journal-capital-adjustment','trading-journal-capital-lock','trading-journal-r-limit','trading-journal-r-lock','trading-journal-fuse-until','trading-journal-extra-used','trading-journal-cycle-start','trading-journal-limit-notice-seen','trading-journal-fuse-unlock-used','trading-journal-admin-reset-at','trading-journal-daily-base','trading-journal-undo']
export const cloudConfigured = Boolean(URL && ANON)
type Session = { access_token:string; refresh_token:string; expires_at?:number; expires_in?:number; token_type?:string; user?:{id:string;email?:string} }
const headers=(token:string)=>({'apikey':ANON,'Authorization':`Bearer ${token}`,'Content-Type':'application/json'})
const readSession=():Session|null=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
export const cloudEmail=()=>readSession()?.user?.email||''
export const hasCloudSession=()=>Boolean(readSession()?.access_token)
function saveSession(session:Session){if(session.expires_in&&!session.expires_at)session.expires_at=Math.floor(Date.now()/1000)+session.expires_in;localStorage.setItem(SESSION_KEY,JSON.stringify(session))}
async function validSession():Promise<Session|null>{
 let session=readSession();if(!session?.access_token)return null
 const now=Math.floor(Date.now()/1000)
 if(session.expires_at&&session.expires_at>now+60)return session
 if(!session.refresh_token)return session
 const res=await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{'apikey':ANON,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})})
 const body=await res.json();if(!res.ok){cloudLogout();return null};saveSession(body as Session);return body as Session
}
export function localSnapshot(){const data:Record<string,string|null>={};for(const key of CLOUD_KEYS)data[key]=localStorage.getItem(key);return data}
export function applySnapshot(data:Record<string,string|null>){const before=localSnapshot();for(const key of CLOUD_KEYS){const value=data?.[key];if(value===null||value===undefined)localStorage.removeItem(key);else localStorage.setItem(key,value)}return JSON.stringify(before)!==JSON.stringify(localSnapshot())}
export async function cloudSignup(email:string,password:string){
 if(!cloudConfigured)throw new Error('云端同步尚未配置')
 const res=await fetch(`${URL}/auth/v1/signup`,{method:'POST',headers:{'apikey':ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password})})
 const body=await res.json();if(!res.ok)throw new Error(body.error_description||body.msg||body.message||'注册失败');if(body.access_token)saveSession(body as Session);return body as Session
}
export async function cloudLogin(email:string,password:string){
 if(!cloudConfigured)throw new Error('云端同步尚未配置')
 const res=await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{'apikey':ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password})})
 const body=await res.json();if(!res.ok)throw new Error(body.error_description||body.msg||body.message||'登录失败');saveSession(body as Session);return body as Session
}
export function cloudLogout(){localStorage.removeItem(SESSION_KEY)}
async function getRemote(token:string,user:string){const res=await fetch(`${URL}/rest/v1/trading_journal_cloud?select=data,updated_at&user_id=eq.${encodeURIComponent(user)}&limit=1`,{headers:headers(token)});if(!res.ok)throw new Error('读取云端数据失败');const rows=await res.json();return rows[0]||null}
export async function syncCloud(){
 if(!cloudConfigured)return {status:'disabled'} as const
 const session=await validSession();if(!session?.access_token||!session.user?.id)return {status:'logged_out'} as const
 const remote=await getRemote(session.access_token,session.user.id)
 if(!remote){await uploadCloud();return {status:'uploaded'} as const}
 const changed=applySnapshot(remote.data||{});return {status:changed?'downloaded':'synced',updatedAt:remote.updated_at} as const
}
export async function uploadCloud(){
 if(!cloudConfigured)throw new Error('云端同步尚未配置')
 const session=await validSession();if(!session?.access_token||!session.user?.id)throw new Error('登录状态已失效，请重新登录')
 const payload={user_id:session.user.id,data:localSnapshot(),updated_at:new Date().toISOString()}
 const res=await fetch(`${URL}/rest/v1/trading_journal_cloud?on_conflict=user_id`,{method:'POST',headers:{...headers(session.access_token),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)})
 if(!res.ok)throw new Error((await res.text())||'上传云端失败');return payload.updated_at
}
