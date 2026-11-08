import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsAdmin } from '@/lib/admin'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Printer = Database['public']['Tables']['printers']['Row']

export default function AdminScreen() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [printers, setPrinters] = useState<Printer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    geofence_radius_m: '500',
    is_active: true,
  })

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home')
      return
    }

    fetchPrinters()
  }, [isAdmin, navigate])

  const fetchPrinters = async () => {
    if (!supabase) return

    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('printers')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setPrinters(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch printers')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    try {
      const { error: err } = await supabase.from('printers').insert({
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        geofence_radius_m: parseInt(formData.geofence_radius_m),
        is_active: formData.is_active,
      })

      if (err) throw err

      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        geofence_radius_m: '500',
        is_active: true,
      })
      setShowAddForm(false)
      await fetchPrinters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add printer')
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (!supabase) return

    try {
      const { error: err } = await supabase
        .from('printers')
        .update({ is_active: !currentActive })
        .eq('id', id)

      if (err) throw err
      await fetchPrinters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update printer')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin: Printer Management</h1>
        <p className="text-gray-600 mb-6">Add, edit, and manage thermal printers</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Add Printer Form */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 px-4 py-2 bg-fill-primary text-white rounded font-medium hover:opacity-80"
          >
            + Add Printer
          </button>
        )}

        {showAddForm && (
          <form
            onSubmit={handleAddPrinter}
            className="mb-6 bg-white border border-gray-200 rounded p-4 space-y-3"
          >
            <h2 className="text-lg font-semibold text-gray-800">New Printer</h2>

            <input
              type="text"
              placeholder="Printer name (e.g., On-Call Cafe)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Latitude"
                step="0.0001"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Longitude"
                step="0.0001"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
              />
            </div>

            <input
              type="number"
              placeholder="Geofence radius (meters)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={formData.geofence_radius_m}
              onChange={(e) => setFormData({ ...formData, geofence_radius_m: e.target.value })}
              required
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 text-sm"
              >
                Add Printer
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded font-medium hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Printers List */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Location</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Geofence</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {printers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-black font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.geofence_radius_m}m</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={`px-3 py-1 rounded font-medium text-xs ${
                        p.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {printers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No printers yet. Add one above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
