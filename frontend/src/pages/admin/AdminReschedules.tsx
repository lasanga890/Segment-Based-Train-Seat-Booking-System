import { useEffect, useState } from 'react'
import { adminGetRescheduleRequests, adminApproveRescheduleRequest } from '../../services/api'
import { CheckCircle2, Inbox } from 'lucide-react'

export default function AdminReschedules(){
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    try{
      setLoading(true)
      const res = await adminGetRescheduleRequests()
      setRequests(res)
    }catch(e:any){ console.error(e); alert(e.message || e) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const handleApprove = async (id:string) => {
    if(!confirm('Approve reschedule request and apply changes to booking?')) return
    try{
      await adminApproveRescheduleRequest(id)
      setToast('Reschedule approved')
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

      <h2 className="text-2xl font-black text-white mb-4">Reschedule Requests</h2>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="glass-card overflow-auto">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Inbox size={36} className="mx-auto mb-2 opacity-40" /> <div>No reschedule requests</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase">
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">New Schedule / Stations / Seat</th>
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
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {r.new_schedule_id || '-'} <br/>
                      {r.new_start_station_id || ''} → {r.new_end_station_id || ''} <br/>
                      Seat: {r.new_seat_id || '-'}
                    </td>
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
