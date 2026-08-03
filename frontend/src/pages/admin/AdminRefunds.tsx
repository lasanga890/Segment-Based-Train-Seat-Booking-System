import { useEffect, useState } from 'react'
import { adminGetRefundRequests, adminApproveRefundRequest } from '../../services/api'
import { CheckCircle2, Inbox, RefreshCw } from 'lucide-react'

export default function AdminRefunds(){
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    try{
      setLoading(true)
      const res = await adminGetRefundRequests()
      setRequests(res)
    }catch(e:any){ console.error(e); alert(e.message || e) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const handleApprove = async (id:string) => {
    if(!confirm('Approve refund and mark as issued?')) return
    try{
      await adminApproveRefundRequest(id)
      setToast('Refund approved')
      setTimeout(()=>setToast(null),3000)
      load()
    }catch(e:any){ alert(e.message || 'Failed') }
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border bg-green-500/10 border-green-500/20 text-green-400 z-50">
          <CheckCircle2 /> <span>{toast}</span>
        </div>
      )}

      <h2 className="text-2xl font-black text-white mb-4">Refund Requests</h2>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="glass-card overflow-auto">
          <div className="flex justify-end border-b border-white/5 px-3 py-2">
            <button onClick={load} disabled={loading} aria-label="Refresh refund requests" title="Refresh table data" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Inbox size={36} className="mx-auto mb-2 opacity-40" /> <div>No refund requests</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase">
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Fare / Refund</th>
                  <th className="px-4 py-3">Requested At</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-mono text-slate-300">{r.id.substring(0,8)}</td>
                    <td className="px-4 py-3">{r.booking_id ? r.booking_id.substring(0,8) : '-'}</td>
                    <td className="px-4 py-3">{r.passenger_name || r.user_id}</td>
                    <td className="px-4 py-3 font-semibold text-brand-300">LKR {r.fare_lkr?.toFixed(2) || r.refundable_amount?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.requested_at}</td>
                    <td className="px-4 py-3 text-xs">{r.status}</td>
                    <td className="px-4 py-3">
                      {r.status === 'PENDING' && (
                        <button onClick={() => handleApprove(r.id)} className="btn-primary text-xs px-3 py-1">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
