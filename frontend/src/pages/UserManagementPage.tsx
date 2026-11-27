import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminService } from '@/services/auth'
import DashboardLayout from '@/layouts/DashboardLayout'
import type { User } from '@/types/auth'
import { UserPlus, Search, ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react'

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(['EXAMINER', 'CANDIDATE']),
})
type CreateUserForm = z.infer<typeof createUserSchema>

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'EXAMINER' },
  })
  const mutation = useMutation({
    mutationFn: (data: CreateUserForm) => adminService.createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border w-full max-w-md p-6 shadow-2xl" style={{ borderColor: 'hsl(150 22% 86%)' }}>
        <h2 className="text-base font-semibold mb-5" style={{ color: 'hsl(161 38% 13%)' }}>Invite person</h2>
        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {[
            { id: 'full_name', label: 'Full name', type: 'text', reg: register('full_name'), err: errors.full_name },
            { id: 'email', label: 'Email address', type: 'email', reg: register('email'), err: errors.email },
            { id: 'password', label: 'Password', type: 'password', reg: register('password'), err: errors.password },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>{f.label}</label>
              <input {...f.reg} type={f.type}
                     className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                     style={{ borderColor: 'hsl(150 22% 86%)' }} />
              {f.err && <p className="text-xs text-red-600 mt-1">{f.err.message}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>Role</label>
            <select {...register('role')} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <option value="EXAMINER">Examiner</option>
              <option value="CANDIDATE">Candidate</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm border rounded-lg transition-colors"
                    style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
                    style={{ background: '#007A62' }}>
              {isSubmitting ? 'Sending…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
})
type EditUserForm = z.infer<typeof editUserSchema>

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { full_name: user.full_name, email: user.email },
  })
  const mutation = useMutation({
    mutationFn: (data: EditUserForm) => adminService.patchUser(user.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border w-full max-w-md p-6 shadow-2xl" style={{ borderColor: 'hsl(150 22% 86%)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Edit person</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" style={{ color: 'hsl(157 10% 44%)' }} />
          </button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>}
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>Full name</label>
            <input {...register('full_name')} type="text"
                   className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                   style={{ borderColor: 'hsl(150 22% 86%)' }} />
            {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>Email address</label>
            <input {...register('email')} type="email"
                   className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                   style={{ borderColor: 'hsl(150 22% 86%)' }} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm border rounded-lg transition-colors"
                    style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
                    style={{ background: '#007A62' }}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const roleBadge: Record<string, string> = {
  ADMIN: 'badge bg-purple-100 text-purple-700',
  EXAMINER: 'badge bg-blue-100 text-blue-700',
  CANDIDATE: 'badge badge-active',
}

export default function UserManagementPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => adminService.listUsers({ page, page_size: 20, search: search || undefined, role: roleFilter || undefined }),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => adminService.setStatus(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>People & access</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Keep the right people in the right workspaces.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                style={{ background: '#007A62' }}>
          <UserPlus className="w-4 h-4" />
          Invite people
        </button>
      </div>

      {/* Table card */}
      <div className="n360-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
             style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>
            <span className="font-bold">{data?.total ?? '—'}</span>
            <span style={{ color: 'hsl(157 10% 44%)' }}> people in this workspace</span>
          </p>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'hsl(157 10% 44%)' }} />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                     placeholder="Search by name or email…"
                     className="pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1"
                     style={{ borderColor: 'hsl(150 22% 86%)' }} />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                    className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                    style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EXAMINER">Examiner</option>
              <option value="CANDIDATE">Candidate</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
             style={{ color: 'hsl(157 10% 44%)', borderColor: 'hsl(150 22% 86%)' }}>
          <span className="col-span-5">Person</span>
          <span className="col-span-3">Role</span>
          <span className="col-span-2">Access</span>
          <span className="col-span-2" />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading…</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            {data?.items.map((u: User) => {
              const initials = u.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <li key={u.id}
                    className="grid grid-cols-12 items-center px-5 py-3 hover:bg-green-50/50 transition-colors">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                         style={{ background: '#007A62' }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(161 38% 13%)' }}>{u.full_name}</p>
                      <p className="text-xs truncate" style={{ color: 'hsl(157 10% 44%)' }}>{u.email}</p>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className={roleBadge[u.role] ?? 'badge'}>{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={u.is_active ? 'badge badge-active' : 'badge badge-draft'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg border hover:bg-green-50 transition-colors"
                            style={{ borderColor: 'hsl(150 22% 86%)' }}
                            title="Edit">
                      <Edit2 className="w-3.5 h-3.5" style={{ color: 'hsl(157 10% 44%)' }} />
                    </button>
                    <button onClick={() => toggleStatus.mutate({ id: u.id, is_active: !u.is_active })}
                            className="text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-green-50"
                            style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
             style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
          <span>{data?.total ?? 0} records</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </DashboardLayout>
  )
}
