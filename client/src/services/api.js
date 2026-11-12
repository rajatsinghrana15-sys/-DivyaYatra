const BASE=import.meta.env.VITE_API_URL||'';
export function token(){return localStorage.getItem('yatra_token')}
export async function api(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};if(token())headers.Authorization=`Bearer ${token()}`;const r=await fetch(`${BASE}/api${path}`,{...options,headers,body:options.body?JSON.stringify(options.body):undefined});const data=await r.json().catch(()=>({message:'Unexpected server response.'}));if(!r.ok)throw new Error(data.message||'Request failed.');return data}
