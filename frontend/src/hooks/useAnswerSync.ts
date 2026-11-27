/**
 * useAnswerSync — per-question save-state management with race-condition prevention.
 *
 * Key design decisions:
 * - Each question has its own AbortController; a newer request aborts the in-flight one.
 * - Version numbers from the server are tracked; each save sends client_version for OCC.
 * - Written answers are debounced (500ms). Choice/flag saves fire immediately.
 * - Offline changes are queued in IndexedDB and replayed on reconnect.
 * - The backend is always the source of truth; never claim Saved until the server responds.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { candidateService } from '@/services/candidate'
import type { ResponseData, SaveResponseResult } from '@/types/candidate'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface AnswerSyncState {
  /** Per-question save state */
  saveStates: Record<number, SaveState>
  /** Local (possibly unsaved) responses */
  localResponses: Record<number, ResponseData>
  /** True when navigator.onLine is false */
  isOffline: boolean
  /** Number of pending (un-synced) answers while offline */
  pendingCount: number
  /** Save a choice-based answer immediately */
  saveChoices: (aqId: number, choices: number[], writtenText?: string | null) => void
  /** Debounced save for written text */
  saveWritten: (aqId: number, text: string) => void
  /** Toggle review flag */
  saveFlag: (aqId: number, marked: boolean) => void
  /** Set initial responses from server (on load/refresh) */
  hydrate: (responses: Record<number, ResponseData>) => void
  /** Flush all pending writes (call before submit) */
  flushAll: () => Promise<void>
}

const IDB_DB = 'nigrani_pending'
const IDB_STORE = 'pending_answers'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'aqId' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(aqId: number, payload: object): Promise<void> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({ aqId, payload, ts: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* IDB unavailable (private window etc.) — silently ignore */ }
}

async function idbGetAll(): Promise<Array<{ aqId: number; payload: object }>> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

async function idbDelete(aqId: number): Promise<void> {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(aqId)
      tx.oncomplete = () => resolve()
    })
  } catch { /* ignore */ }
}

export function useAnswerSync(attemptId: number | null): AnswerSyncState {
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({})
  const [localResponses, setLocalResponses] = useState<Record<number, ResponseData>>({})
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  // Track server-confirmed versions per question
  const versionsRef = useRef<Record<number, number>>({})
  // AbortControllers per question (one inflight request at a time per question)
  const controllersRef = useRef<Record<number, AbortController>>({})
  // Debounce timers for written answers
  const writtenTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  // Pending offline queue
  const pendingRef = useRef<Record<number, { choices: number[]; written: string | null }>>({})

  const setSaveState = useCallback((aqId: number, state: SaveState) => {
    setSaveStates(prev => ({ ...prev, [aqId]: state }))
  }, [])

  const hydrate = useCallback((responses: Record<number, ResponseData>) => {
    setLocalResponses(responses)
    // On hydrate, mark all as saved (server-confirmed)
    const states: Record<number, SaveState> = {}
    for (const id of Object.keys(responses)) states[Number(id)] = 'saved'
    setSaveStates(states)
  }, [])

  // Core save function — fires HTTP, handles abort, tracks version
  const doSave = useCallback(async (
    aqId: number,
    choices: number[],
    written: string | null,
  ) => {
    if (!attemptId) return

    // Abort any in-flight request for this question
    controllersRef.current[aqId]?.abort()
    const controller = new AbortController()
    controllersRef.current[aqId] = controller

    setSaveState(aqId, 'saving')
    // Optimistically update local state so navigation doesn't lose the input
    setLocalResponses(prev => ({
      ...prev,
      [aqId]: {
        attempt_question_id: aqId,
        selected_choice_ids: choices,
        written_text: written,
        is_marked_for_review: prev[aqId]?.is_marked_for_review ?? false,
      },
    }))

    try {
      const clientVersion = versionsRef.current[aqId]
      const result: SaveResponseResult = await candidateService.saveResponse(
        attemptId,
        aqId,
        {
          selected_choice_ids: choices,
          written_text: written,
          ...(clientVersion !== undefined ? { client_version: clientVersion } : {}),
        },
      )
      if (controller.signal.aborted) return  // superseded by a newer request

      versionsRef.current[aqId] = result.version
      setSaveState(aqId, 'saved')
      // Confirm local state with server data
      setLocalResponses(prev => ({
        ...prev,
        [aqId]: {
          attempt_question_id: aqId,
          selected_choice_ids: result.selected_choice_ids,
          written_text: result.written_text,
          is_marked_for_review: prev[aqId]?.is_marked_for_review ?? false,
        },
      }))
      await idbDelete(aqId)
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const isNetwork = !navigator.onLine || (err instanceof Error && err.name === 'NetworkError')
      if (isNetwork) {
        // Queue for retry when online
        pendingRef.current[aqId] = { choices, written }
        setPendingCount(Object.keys(pendingRef.current).length)
        await idbPut(aqId, { choices, written })
        setSaveState(aqId, 'error')
      } else {
        setSaveState(aqId, 'error')
      }
    }
  }, [attemptId, setSaveState])

  const saveChoices = useCallback((aqId: number, choices: number[], writtenText?: string | null) => {
    // Cancel any pending debounce for this question
    if (writtenTimersRef.current[aqId]) clearTimeout(writtenTimersRef.current[aqId])
    doSave(aqId, choices, writtenText ?? localResponses[aqId]?.written_text ?? null)
  }, [doSave, localResponses])

  const saveWritten = useCallback((aqId: number, text: string) => {
    // Update local state immediately (so user sees their typing)
    setLocalResponses(prev => ({
      ...prev,
      [aqId]: {
        attempt_question_id: aqId,
        selected_choice_ids: prev[aqId]?.selected_choice_ids ?? [],
        written_text: text,
        is_marked_for_review: prev[aqId]?.is_marked_for_review ?? false,
      },
    }))
    setSaveState(aqId, 'idle')

    // Debounce the actual save
    if (writtenTimersRef.current[aqId]) clearTimeout(writtenTimersRef.current[aqId])
    writtenTimersRef.current[aqId] = setTimeout(() => {
      doSave(aqId, localResponses[aqId]?.selected_choice_ids ?? [], text || null)
    }, 500)
  }, [doSave, localResponses])

  const saveFlag = useCallback(async (aqId: number, marked: boolean) => {
    if (!attemptId) return
    setSaveState(aqId, 'saving')
    setLocalResponses(prev => ({
      ...prev,
      [aqId]: {
        attempt_question_id: aqId,
        selected_choice_ids: prev[aqId]?.selected_choice_ids ?? [],
        written_text: prev[aqId]?.written_text ?? null,
        is_marked_for_review: marked,
      },
    }))
    try {
      await candidateService.toggleReviewFlag(attemptId, aqId, marked)
      setSaveState(aqId, 'saved')
    } catch {
      setSaveState(aqId, 'error')
    }
  }, [attemptId, setSaveState])

  const flushAll = useCallback(async () => {
    // Flush debounced written answers
    for (const [aqIdStr, timer] of Object.entries(writtenTimersRef.current)) {
      clearTimeout(timer)
      const aqId = Number(aqIdStr)
      const resp = localResponses[aqId]
      if (resp?.written_text !== undefined) {
        await doSave(aqId, resp.selected_choice_ids, resp.written_text)
      }
    }
    // Flush offline pending queue
    for (const [aqIdStr, payload] of Object.entries(pendingRef.current)) {
      const aqId = Number(aqIdStr)
      await doSave(aqId, payload.choices, payload.written)
    }
  }, [doSave, localResponses])

  // Offline / online detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = async () => {
      setIsOffline(false)
      // Replay pending from IDB
      const pending = await idbGetAll()
      for (const { aqId, payload } of pending) {
        const p = payload as { choices: number[]; written: string | null }
        await doSave(aqId, p.choices, p.written)
      }
      pendingRef.current = {}
      setPendingCount(0)
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [doSave])

  return {
    saveStates,
    localResponses,
    isOffline,
    pendingCount,
    saveChoices,
    saveWritten,
    saveFlag,
    hydrate,
    flushAll,
  }
}
