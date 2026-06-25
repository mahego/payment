'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  ChevronLeft,
  Loader2,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    addressLine: string;
    locality: string | null;
    municipality: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  assignedTo: {
    id: string;
    name: string;
    role: string;
  } | null;
  comments: Comment[];
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isSupervisor = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');

  const [commentBody, setCommentBody] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState('');

  // Fetch ticket details
  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then((r) => r.data),
  });

  // Fetch staff users (only for supervisors to re-assign)
  const { data: staff } = useQuery<StaffUser[]>({
    queryKey: ['staff-users-assign'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isSupervisor,
  });

  // Mutation to add comment
  const addCommentMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/comments`, { body }),
    onSuccess: () => {
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  // Mutation to update ticket status/assignee (Supervisor only)
  const updateTicketMutation = useMutation({
    mutationFn: (data: { status?: string; assignedToId?: string | null }) =>
      api.patch(`/tickets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setAddingComment(true);
    setError('');
    try {
      await addCommentMutation.mutateAsync(commentBody);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar comentario');
    } finally {
      setAddingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm">Cargando detalles del ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-slate-800">Ticket no encontrado</h2>
        <Link href="/tickets" className="text-indigo-600 font-semibold hover:underline mt-2 inline-block">
          Volver a soporte
        </Link>
      </div>
    );
  }

  const getPriorityStyle = (priority: TicketDetail['priority']) => {
    const styles = {
      LOW: 'bg-slate-100 text-slate-700 border-slate-200',
      MEDIUM: 'bg-blue-50 text-blue-700 border-blue-100',
      HIGH: 'bg-amber-50 text-amber-700 border-amber-100',
      CRITICAL: 'bg-rose-50 text-rose-700 border-rose-100 font-extrabold animate-pulse',
    };
    return styles[priority];
  };

  const getStatusStyle = (status: TicketDetail['status']) => {
    const styles = {
      OPEN: 'bg-rose-50 text-rose-700 border-rose-100',
      ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-100',
      IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-100',
      RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return styles[status];
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/tickets"
          className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{ticket.title}</h1>
          <p className="text-sm text-slate-500">
            Ticket #{ticket.id.slice(-6).toUpperCase()} &bull; Creado el{' '}
            {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area: Detail & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="glass-card bg-white border border-slate-200/60 shadow-glass rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${getStatusStyle(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${getPriorityStyle(ticket.priority)}`}>
                Prioridad {ticket.priority}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1.5">Descripción de la Falla</h3>
              <p className="text-slate-800 text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div>
                <span>Creado por:</span>
                <span className="font-bold text-slate-800 ml-1.5">
                  {ticket.createdBy.name} ({ticket.createdBy.role})
                </span>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <span>Resuelto el:</span>
                  <span className="font-bold text-emerald-700 ml-1.5">
                    {new Date(ticket.resolvedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="glass-card bg-white border border-slate-200/60 shadow-glass rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Comentarios y Avances ({ticket.comments.length})
            </h3>

            {/* Timeline */}
            <div className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  No hay comentarios en este ticket aún. Escribe el primer comentario abajo.
                </p>
              ) : (
                <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-6">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 flex h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                      
                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-900 text-xs">
                            {comment.author.name}{' '}
                            <span className="text-[10px] uppercase font-semibold text-indigo-500 ml-1">
                              ({comment.author.role})
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString()}{' '}
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            {ticket.status !== 'CLOSED' && (
              <form onSubmit={handleAddCommentSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Escribe una actualización o nota sobre el servicio..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingComment || !commentBody.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {addingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Enviar Comentario
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar Info & Controls */}
        <div className="space-y-6">
          {/* Customer Info Box */}
          <div className="glass-card bg-white border border-slate-200/60 shadow-glass rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Información del Cliente
            </h3>
            <div>
              <Link
                href={`/customers/${ticket.customer.id}`}
                className="text-base font-bold text-indigo-600 hover:underline block"
              >
                {ticket.customer.firstName} {ticket.customer.lastName}
              </Link>
              <span className="text-xs text-slate-400">ID: {ticket.customer.id}</span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="font-semibold block text-slate-400 uppercase tracking-wider mb-0.5">Teléfono:</span>
                <span className="text-slate-800 font-medium">{ticket.customer.phone || '—'}</span>
              </div>
              <div>
                <span className="font-semibold block text-slate-400 uppercase tracking-wider mb-0.5">Dirección:</span>
                <span className="text-slate-800 font-medium">
                  {ticket.customer.addressLine}
                  {ticket.customer.locality ? `, ${ticket.customer.locality}` : ''}
                  {ticket.customer.municipality ? `, ${ticket.customer.municipality}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Management Controls (Supervisor / Admin only) */}
          {isSupervisor && ticket.status !== 'CLOSED' && (
            <div className="glass-card bg-white border border-slate-200/60 shadow-glass rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Gestión del Ticket
              </h3>

              {/* Status Change */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cambiar Estado
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketMutation.mutate({ status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="OPEN">Abierto</option>
                  <option value="ASSIGNED">Asignado</option>
                  <option value="IN_PROGRESS">En Progreso</option>
                  <option value="RESOLVED">Resuelto</option>
                </select>
              </div>

              {/* Reassignment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Asignar a Técnico
                </label>
                <select
                  value={ticket.assignedTo?.id || ''}
                  onChange={(e) =>
                    updateTicketMutation.mutate({ assignedToId: e.target.value || null })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Sin Asignar</option>
                  {staff
                    ?.filter((s) => s.role === 'TECHNICIAN' || s.role === 'SUPERVISOR' || s.role === 'ADMIN')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="pt-2 space-y-2">
                {ticket.status !== 'RESOLVED' && (
                  <button
                    onClick={() => updateTicketMutation.mutate({ status: 'RESOLVED' })}
                    className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver Ticket
                  </button>
                )}
                {ticket.status === 'RESOLVED' && (
                  <button
                    onClick={() => updateTicketMutation.mutate({ status: 'CLOSED' })}
                    className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Cerrar Ticket
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
