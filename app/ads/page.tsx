'use client'

import { useState, useEffect } from 'react'

interface ABVariant {
  id: string
  name: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
}

interface ABTest {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused'
  startDate: string
  endDate?: string
  trafficSplit: number[]
  minimumSampleSize: number
  variants: ABVariant[]
  winner: string | null
  confidenceLevel: number
  recommendation: 'scale' | 'pause' | 'continue_testing'
}

function ctr(v: ABVariant) {
  return v.impressions > 0 ? ((v.clicks / v.impressions) * 100).toFixed(2) : '0.00'
}

function convRate(v: ABVariant) {
  return v.clicks > 0 ? ((v.conversions / v.clicks) * 100).toFixed(2) : '0.00'
}

function cpa(v: ABVariant) {
  return v.conversions > 0 ? (v.spend / v.conversions).toFixed(2) : '–'
}

const statusBadge = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-800',
}

const statusLabel = {
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  paused: 'Pausiert',
}

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'abtests' | 'performance'>('abtests')
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [newTest, setNewTest] = useState({ name: '', duration: 30, variants: [{ name: '' }, { name: '' }], trafficSplit: 50, minimumSampleSize: 500 })
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ads/ab-tests')
      .then((r) => r.json())
      .then((d) => { setTests(d.tests); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function showFeedback(msg: string) {
    setActionFeedback(msg)
    setTimeout(() => setActionFeedback(null), 3000)
  }

  function handleScaleWinner(test: ABTest) {
    const winner = test.variants.find((v) => v.id === test.winner)
    showFeedback(`✅ Gewinner "${winner?.name}" wird skaliert. Budget +50% wird beantragt.`)
  }

  function handlePauseLoser(test: ABTest) {
    const loser = test.variants.find((v) => v.id !== test.winner)
    showFeedback(`⏸️ Verlierer "${loser?.name}" wurde pausiert.`)
    setTests((prev) => prev.map((t) => t.id === test.id ? { ...t, status: 'completed' } : t))
  }

  function handleDuplicate(test: ABTest) {
    const dup: ABTest = {
      ...test,
      id: `abt-${Date.now()}`,
      name: `${test.name} (Kopie)`,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: undefined,
      winner: null,
      confidenceLevel: 0,
      recommendation: 'continue_testing',
      variants: test.variants.map((v) => ({ ...v, impressions: 0, clicks: 0, conversions: 0, spend: 0 })),
    }
    setTests((prev) => [dup, ...prev])
    showFeedback(`✅ Test "${test.name}" wurde dupliziert.`)
  }

  async function handleCreateTest() {
    const body = {
      name: newTest.name,
      trafficSplit: Array(newTest.variants.length).fill(Math.floor(100 / newTest.variants.length)),
      minimumSampleSize: newTest.minimumSampleSize,
      variants: newTest.variants.map((v, i) => ({
        id: `var-new-${i}`,
        name: v.name || `Variante ${String.fromCharCode(65 + i)}`,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      })),
    }
    const res = await fetch('/api/ads/ab-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setTests((prev) => [data.test, ...prev])
    setShowCreateModal(false)
    setWizardStep(1)
    setNewTest({ name: '', duration: 30, variants: [{ name: '' }, { name: '' }], trafficSplit: 50, minimumSampleSize: 500 })
    showFeedback(`✅ A/B Test "${data.test.name}" wurde erstellt.`)
  }

  const activeTests = tests.filter((t) => t.status === 'active')
  const completedTests = tests.filter((t) => t.status !== 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: '#282f47' }} className="text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>📊 Ads Modul</h1>
            <p className="text-gray-300 text-sm">Kampagnen-Management &amp; A/B Testing</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">Mock-Modus</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: '#282f47' }} className="border-b border-white/10">
        <div className="max-w-6xl mx-auto flex gap-0">
          {[
            { key: 'campaigns', label: '📢 Kampagnen' },
            { key: 'abtests', label: '🧪 A/B Tests' },
            { key: 'performance', label: '📈 Performance' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-white border-b-2'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={activeTab === tab.key ? { borderBottomColor: '#7ed957' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 text-sm font-medium text-gray-800">
            {actionFeedback}
          </div>
        )}

        {/* A/B Tests Tab */}
        {activeTab === 'abtests' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">A/B Tests</h2>
                <p className="text-gray-500 text-sm">{activeTests.length} aktive Tests · {completedTests.length} abgeschlossen</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#7ed957', color: '#282f47' }}
              >
                + Neuer A/B Test
              </button>
            </div>

            {loading && <div className="text-center py-12 text-gray-400">Lade Tests...</div>}

            {/* Active Tests */}
            {!loading && activeTests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Aktive Tests</h3>
                <div className="space-y-4">
                  {activeTests.map((test) => (
                    <ABTestCard
                      key={test.id}
                      test={test}
                      onScaleWinner={() => handleScaleWinner(test)}
                      onPauseLoser={() => handlePauseLoser(test)}
                      onDuplicate={() => handleDuplicate(test)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Test History */}
            {!loading && completedTests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Verlauf</h3>
                <div className="space-y-3">
                  {completedTests.map((test) => (
                    <ABTestCard
                      key={test.id}
                      test={test}
                      onScaleWinner={() => handleScaleWinner(test)}
                      onPauseLoser={() => handlePauseLoser(test)}
                      onDuplicate={() => handleDuplicate(test)}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && tests.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🧪</div>
                <p className="font-medium">Noch keine A/B Tests</p>
                <p className="text-sm mt-1">Erstelle deinen ersten Test um Anzeigen zu optimieren</p>
              </div>
            )}
          </div>
        )}

        {/* Campaigns Tab (placeholder) */}
        {activeTab === 'campaigns' && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📢</div>
            <p className="font-medium">Kampagnen-Übersicht</p>
            <p className="text-sm">Kommt bald — verbinde Meta/Google Ads für Live-Daten</p>
          </div>
        )}

        {/* Performance Tab (placeholder) */}
        {activeTab === 'performance' && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📈</div>
            <p className="font-medium">Performance-Auswertung</p>
            <p className="text-sm">Kommt bald — ROAS, CTR und Conversion-Trends</p>
          </div>
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Neuer A/B Test</h3>
                <button onClick={() => { setShowCreateModal(false); setWizardStep(1) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              {/* Wizard steps */}
              <div className="flex gap-2 mt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: wizardStep >= step ? '#7ed957' : '#e5e7eb' }} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Schritt {wizardStep} von 3</p>
            </div>

            <div className="p-6 space-y-4">
              {wizardStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test-Name *</label>
                    <input
                      type="text"
                      value={newTest.name}
                      onChange={(e) => setNewTest((p) => ({ ...p, name: e.target.value }))}
                      placeholder="z.B. CTA Varianten Test Q2"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ ['--tw-ring-color' as string]: '#7ed957' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Laufzeit (Tage)</label>
                    <input
                      type="number"
                      value={newTest.duration}
                      onChange={(e) => setNewTest((p) => ({ ...p, duration: Number(e.target.value) }))}
                      min={7}
                      max={90}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <p className="text-sm text-gray-600">Definiere 2–4 Varianten für deinen Test</p>
                  {newTest.variants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#282f47' }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => setNewTest((p) => {
                          const variants = [...p.variants]
                          variants[i] = { name: e.target.value }
                          return { ...p, variants }
                        })}
                        placeholder={`Variante ${String.fromCharCode(65 + i)} beschreiben`}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                      {newTest.variants.length > 2 && (
                        <button onClick={() => setNewTest((p) => ({ ...p, variants: p.variants.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-400 text-lg">×</button>
                      )}
                    </div>
                  ))}
                  {newTest.variants.length < 4 && (
                    <button onClick={() => setNewTest((p) => ({ ...p, variants: [...p.variants, { name: '' }] }))} className="text-sm text-blue-600 hover:text-blue-800">
                      + Variante hinzufügen
                    </button>
                  )}
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Traffic-Split</label>
                    <p className="text-xs text-gray-400 mb-2">Gleichmäßige Verteilung ({Math.floor(100 / newTest.variants.length)}% pro Variante)</p>
                    <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                      {newTest.variants.map((_, i) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: i % 2 === 0 ? '#7ed957' : '#282f47' }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mindest-Stichprobengrösse</label>
                    <input
                      type="number"
                      value={newTest.minimumSampleSize}
                      onChange={(e) => setNewTest((p) => ({ ...p, minimumSampleSize: Number(e.target.value) }))}
                      min={100}
                      step={100}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Empfohlen: 500+ Impressionen pro Variante für statistisch signifikante Ergebnisse</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep((s) => s - 1)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Zurück
                </button>
              )}
              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep((s) => s + 1)}
                  disabled={wizardStep === 1 && !newTest.name}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  style={{ backgroundColor: '#7ed957', color: '#282f47' }}
                >
                  Weiter
                </button>
              ) : (
                <button
                  onClick={handleCreateTest}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#7ed957', color: '#282f47' }}
                >
                  Test erstellen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ABTestCard Component
// ---------------------------------------------------------------------------

function ABTestCard({
  test,
  onScaleWinner,
  onPauseLoser,
  onDuplicate,
  compact = false,
}: {
  test: ABTest
  onScaleWinner: () => void
  onPauseLoser: () => void
  onDuplicate: () => void
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(!compact)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm">{test.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[test.status]}`}>
              {statusLabel[test.status]}
            </span>
            {test.winner && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">
                🏆 Gewinner gefunden
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {test.startDate} {test.endDate ? `→ ${test.endDate}` : '→ laufend'} · {test.variants.length} Varianten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate() }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">
            📋 Kopieren
          </button>
          <span className="text-gray-300">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Konfidenz:</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${test.confidenceLevel}%`,
                backgroundColor: test.confidenceLevel >= 95 ? '#7ed957' : test.confidenceLevel >= 80 ? '#facc15' : '#e5e7eb',
              }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700">{test.confidenceLevel}%</span>
          {test.confidenceLevel >= 95 && <span className="text-xs text-green-600 font-medium">Signifikant ✓</span>}
        </div>
      </div>

      {/* Expanded: Variants comparison */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid gap-3">
            {test.variants.map((variant, idx) => {
              const isWinner = variant.id === test.winner
              return (
                <div
                  key={variant.id}
                  className={`p-3 rounded-xl border-2 ${isWinner ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#282f47' }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{variant.name}</span>
                      {isWinner && <span className="text-xs">🏆</span>}
                    </div>
                    <span className="text-xs text-gray-400">{test.trafficSplit[idx] ?? 50}% Traffic</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-base font-bold text-gray-900">{ctr(variant)}%</div>
                      <div className="text-xs text-gray-400">CTR</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">{convRate(variant)}%</div>
                      <div className="text-xs text-gray-400">Conv. Rate</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">CHF {cpa(variant)}</div>
                      <div className="text-xs text-gray-400">CPA</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">{variant.conversions}</div>
                      <div className="text-xs text-gray-400">Conversions</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          {test.status === 'active' && test.winner && test.confidenceLevel >= 95 && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={onScaleWinner}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90"
                style={{ backgroundColor: '#7ed957', color: '#282f47' }}
              >
                🚀 Gewinner skalieren
              </button>
              <button
                onClick={onPauseLoser}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                ⏸️ Verlierer pausieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
