'use client'

import { ConnectorState, ConnectorStatus } from './types'

const STORAGE_KEY = 'vemo_connector_states'

export function loadConnectorStates(): Record<string, ConnectorState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveConnectorState(id: string, state: ConnectorState): void {
  const all = loadConnectorStates()
  all[id] = state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function getConnectorState(id: string): ConnectorState | undefined {
  return loadConnectorStates()[id]
}

export function connectConnector(
  id: string,
  credentials: Record<string, string>,
): ConnectorState {
  const state: ConnectorState = {
    id,
    status: 'connected',
    credentials,
    lastTestedAt: new Date().toISOString(),
    createdAt: getConnectorState(id)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveConnectorState(id, state)
  return state
}

export function disconnectConnector(id: string): ConnectorState {
  const existing = getConnectorState(id)
  const state: ConnectorState = {
    id,
    status: 'disconnected',
    credentials: {},
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveConnectorState(id, state)
  return state
}

export function setConnectorError(id: string, message: string): ConnectorState {
  const existing = getConnectorState(id)
  const state: ConnectorState = {
    ...(existing ?? { id, createdAt: new Date().toISOString() }),
    id,
    status: 'error' as ConnectorStatus,
    errorMessage: message,
    updatedAt: new Date().toISOString(),
  }
  saveConnectorState(id, state)
  return state
}
